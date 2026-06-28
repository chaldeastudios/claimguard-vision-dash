from django.test import TestCase
from unittest.mock import MagicMock, patch
import uuid
from .models import FraudScore
from .services import FraudScoringService
from .fhir import FHIRConverter

class openIMISFraudIntegrationTests(TestCase):
    """
    Test suite for validating the ClaimGuard fraud scoring logic,
    signal dispatching, and FHIR representation conversions.
    """
    
    def setUp(self):
        # Create mock claim data
        self.claim_uuid = uuid.uuid4()
        self.mock_claim = MagicMock()
        self.mock_claim.uuid = self.claim_uuid
        self.mock_claim.claimed = 12000.00
        
        # Mock Insuree
        self.mock_insuree = MagicMock()
        self.mock_insuree.uuid = uuid.uuid4()
        self.mock_insuree.first_name = "Jane"
        self.mock_insuree.last_name = "Doe"
        self.mock_insuree.gender = "F"
        self.mock_claim.insuree = self.mock_insuree
        
        # Mock Health Facility
        self.mock_facility = MagicMock()
        self.mock_facility.uuid = uuid.uuid4()
        self.mock_facility.name = "Kenyatta National Hospital"
        self.mock_claim.health_facility = self.mock_facility

        # Mock Diagnoses
        self.mock_diagnosis = MagicMock()
        self.mock_diagnosis.code = "A09"
        self.mock_diagnosis.name = "Gastroenteritis"
        self.mock_claim.diagnoses.all.return_type = [self.mock_diagnosis]
        self.mock_claim.diagnoses.first.return_value = self.mock_diagnosis

    @patch('claim.models.Claim.objects.get')
    def test_fraud_score_calculation(self, mock_get_claim):
        """
        Verify that the rule-based calculation assigns appropriate risk levels.
        """
        mock_get_claim.return_value = self.mock_claim
        
        # Evaluate scoring
        result = FraudScoringService.score_claim(self.mock_claim)
        
        self.assertIn('score', result)
        self.assertIn('risk_level', result)
        self.assertIn('reasons', result)
        
        # Amount 12000 is higher than Gastroenteritis (A09) benchmark (1500) * 2.5
        self.assertTrue(result['score'] >= 35.0)
        self.assertTrue(any("benchmark" in r for r in result['reasons']))

    def test_fhir_converters(self):
        """
        Verify that our FHIR converter structures matches HL7 R4 schema.
        """
        # Test claim to FHIR
        fhir_claim = FHIRConverter.claim_to_fhir(self.mock_claim)
        self.assertEqual(fhir_claim['resourceType'], "Claim")
        self.assertEqual(fhir_claim['total']['value'], 12000.00)
        self.assertEqual(fhir_claim['total']['currency'], "KES")
        self.assertEqual(fhir_claim['provider']['display'], "Kenyatta National Hospital")

        # Test patient to FHIR
        fhir_patient = FHIRConverter.patient_to_fhir(self.mock_insuree)
        self.assertEqual(fhir_patient['resourceType'], "Patient")
        self.assertEqual(fhir_patient['gender'], "female")
        self.assertIn("Jane", fhir_patient['name'][0]['given'])

        # Test ClaimResponse FHIR extensions
        mock_score_obj = MagicMock()
        mock_score_obj.score = 75.0
        mock_score_obj.risk_level = "High"
        mock_score_obj.reasons = ["Outlier claim amount"]
        
        fhir_response = FHIRConverter.create_claim_response_fhir(self.mock_claim, mock_score_obj)
        self.assertEqual(fhir_response['resourceType'], "ClaimResponse")
        self.assertEqual(fhir_response['extension'][0]['extension'][0]['valueDecimal'], 75.0)
        self.assertEqual(fhir_response['extension'][0]['extension'][1]['valueString'], "High")
