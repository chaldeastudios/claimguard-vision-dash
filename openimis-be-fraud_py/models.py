from django.db import models
from core.models import UUIDModel, HistoryModel
import uuid

class FraudScore(UUIDModel, HistoryModel):
    """
    Model representing the AI-generated fraud score and risk analysis
    for a submitted openIMIS claim.
    """
    # Link to the openIMIS Claim. UUID is used to support modular decouping
    # and prevent hard foreign-key constraints on core openIMIS tables.
    claim_uuid = models.UUIDField(
        db_index=True, 
        unique=True, 
        default=uuid.uuid4,
        help_text="UUID referencing the core openIMIS Claim record"
    )
    
    # Fraud scoring details
    score = models.FloatField(
        help_text="Fraud risk score percentage (0.0 to 100.0)"
    )
    risk_level = models.CharField(
        max_length=10,
        choices=[
            ('Low', 'Low Risk'),
            ('Medium', 'Medium Risk'),
            ('High', 'High Risk')
        ],
        default='Low',
        help_text="Adjudication risk level category"
    )
    reasons = models.JSONField(
        default=list,
        help_text="Structured reasons/rules triggered for risk classification"
    )
    
    scored_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp of risk assessment execution"
    )

    class Meta:
        db_table = "claim_fraud_score"
        verbose_name = "Fraud Score"
        verbose_name_plural = "Fraud Scores"

    def __str__(self):
        return f"Claim {self.claim_uuid} - Score: {self.score}% ({self.risk_level})"
