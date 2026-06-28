import requests
from django.conf import settings
from claim.models import Claim
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class FraudScoringService:
    """
    Service responsible for querying claim details from openIMIS core tables
    and calculating the fraud risk score using AI model rules.
    """
    
    @classmethod
    def score_claim_by_uuid(cls, claim_uuid):
        """
        Retrieves the claim object and executes risk assessment.
        """
        try:
            # Query the core openIMIS Claim model
            claim = Claim.objects.get(uuid=claim_uuid)
            return cls.score_claim(claim)
        except Claim.DoesNotExist:
            logger.error(f"Claim with uuid {claim_uuid} not found in openIMIS core database")
            raise ValueError(f"Claim not found")

    @classmethod
    def score_claim(cls, claim):
        """
        Evaluates a claim dictionary/object against specific fraud rules.
        """
        reasons = []
        score = 0.0

        # Rule 1: Amount vs Diagnosis Benchmark Ratio
        # OpenIMIS has a claim detail item structure (ClaimItem / ClaimService)
        total_amount = claim.claimed
        diagnosis = claim.diagnoses.first() # Get primary diagnosis
        
        # Static check or API evaluation
        if diagnosis:
            # Simple demonstration threshold logic
            avg_benchmark = cls._get_diagnosis_benchmark(diagnosis.code)
            if total_amount > (avg_benchmark * 2.5):
                score += 35.0
                reasons.append(
                    f"Claim amount (KES {total_amount:,.2f}) significantly exceeds the benchmark for "
                    f"diagnosis {diagnosis.code} - {diagnosis.name} (benchmark: KES {avg_benchmark:,.2f})"
                )

        # Rule 2: Near-Duplicate Claims (within 7 days for same patient, facility & diagnosis)
        duplicate_window = timezone.now() - timedelta(days=7)
        near_duplicates = Claim.objects.filter(
            insuree=claim.insuree,
            date_from__gte=duplicate_window,
            diagnoses__in=claim.diagnoses.all()
        ).exclude(uuid=claim.uuid).count()

        if near_duplicates > 0:
            score += 40.0
            reasons.append(
                f"Flagged {near_duplicates} duplicate claim(s) for same Insuree with overlapping "
                f"diagnosis codes within the last 7 days."
            )

        # Rule 3: Patient Velocity (Multiple facilities in a short window)
        facility_window = timezone.now() - timedelta(days=14)
        distinct_facilities = Claim.objects.filter(
            insuree=claim.insuree,
            date_from__gte=facility_window
        ).values('health_facility').distinct().count()

        if distinct_facilities >= 3:
            score += 25.0
            reasons.append(
                f"High patient velocity: Insuree visited {distinct_facilities} different healthcare facilities "
                f"within a 14-day window."
            )

        # Cap the score at 100.0
        score = min(score, 100.0)

        # Determine risk level category
        if score >= 70.0:
            risk_level = 'High'
        elif score >= 35.0:
            risk_level = 'Medium'
        else:
            risk_level = 'Low'

        # Fallback to external AI scoring server if defined
        try:
            config = getattr(settings, 'OPENIMIS_FRAUD_CONFIG', {})
            external_url = config.get('external_scorer_endpoint')
            if external_url:
                response = requests.post(external_url, json={
                    'claim_uuid': str(claim.uuid),
                    'amount': float(total_amount),
                    'diagnosis_code': diagnosis.code if diagnosis else 'N/A',
                    'insuree_id': str(claim.insuree.uuid) if claim.insuree else 'N/A',
                    'facility': str(claim.health_facility.uuid) if claim.health_facility else 'N/A'
                }, timeout=5)
                if response.status_code == 200:
                    ai_result = response.json()
                    # Override with external AI score if successfully completed
                    score = ai_result.get('score', score)
                    risk_level = ai_result.get('risk_level', risk_level)
                    reasons = ai_result.get('reasons', reasons)
        except Exception as api_err:
            logger.warning(f"External fraud scorer connection offline, using rule-based score: {str(api_err)}")

        return {
            'score': score,
            'risk_level': risk_level,
            'reasons': reasons
        }

    @staticmethod
    def _get_diagnosis_benchmark(diagnosis_code):
        """
        Returns average KES amount benchmarks for specific Kenyan NHIF / openIMIS codes.
        """
        benchmarks = {
            'A09': 1500.0,  # Gastroenteritis
            'J06': 2000.0,  # Acute upper respiratory infection
            'B54': 3000.0,  # Malaria
            'I10': 5000.0,  # Essential hypertension
            'E11': 8000.0,  # Type 2 diabetes mellitus
        }
        return benchmarks.get(diagnosis_code, 4000.0)
