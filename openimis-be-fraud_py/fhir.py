import uuid
from django.utils import timezone

class FHIRConverter:
    """
    Utility class to convert openIMIS data models into standard HL7 FHIR R4 JSON resources,
    ensuring international interoperability.
    """

    @staticmethod
    def claim_to_fhir(claim):
        """
        Converts openIMIS Claim model to HL7 FHIR R4 Claim Resource.
        """
        return {
            "resourceType": "Claim",
            "id": str(claim.uuid),
            "status": "active",
            "type": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                    "code": "institutional"
                }]
            },
            "use": "claim",
            "patient": {
                "reference": f"Patient/{claim.insuree.uuid}",
                "display": f"{claim.insuree.first_name} {claim.insuree.last_name}"
            },
            "created": claim.date_from.isoformat() if claim.date_from else timezone.now().isoformat(),
            "provider": {
                "reference": f"Organization/{claim.health_facility.uuid}",
                "display": claim.health_facility.name
            },
            "insurance": [{
                "sequence": 1,
                "focal": True,
                "coverage": {
                    "reference": f"Coverage/{claim.insuree.uuid}-coverage"
                }
            }],
            "total": {
                "value": float(claim.claimed),
                "currency": "KES"
            }
        }

    @staticmethod
    def patient_to_fhir(insuree):
        """
        Converts openIMIS Insuree model to HL7 FHIR R4 Patient Resource.
        """
        return {
            "resourceType": "Patient",
            "id": str(insuree.uuid),
            "identifier": [
                {
                    "use": "official",
                    "type": {
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                            "code": "MC",
                            "display": "Patient's Card Number"
                        }]
                    },
                    "value": insuree.chf_id
                }
            ],
            "active": True,
            "name": [{
                "use": "official",
                "family": insuree.last_name,
                "given": [insuree.first_name]
            }],
            "gender": "male" if insuree.gender == 'M' else "female",
            "birthDate": insuree.dob.strftime("%Y-%m-%d") if insuree.dob else None
        }

    @staticmethod
    def create_claim_response_fhir(claim, fraud_score_obj):
        """
        Converts openIMIS claim adjudication outcome + ClaimGuard fraud evaluation
        into an HL7 FHIR R4 ClaimResponse Resource.
        
        Uses FHIR Extensions to map the AI scoring attributes without altering the base specification.
        """
        return {
            "resourceType": "ClaimResponse",
            "id": str(uuid.uuid4()),
            "status": "active",
            "type": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                    "code": "institutional"
                }]
            },
            "use": "claim",
            "outcome": "queued",
            "patient": {
                "reference": f"Patient/{claim.insuree.uuid}"
            },
            "created": timezone.now().isoformat(),
            "request": {
                "reference": f"Claim/{claim.uuid}"
            },
            "extension": [
                {
                    "url": "https://claimguard.dev/fhir/StructureDefinition/claim-fraud-analysis",
                    "extension": [
                        {
                            "url": "riskScore",
                            "valueDecimal": float(fraud_score_obj.score)
                        },
                        {
                            "url": "riskLevel",
                            "valueString": fraud_score_obj.risk_level
                        },
                        {
                            "url": "reasons",
                            "valueString": ", ".join(fraud_score_obj.reasons)
                        }
                    ]
                }
            ]
        }
