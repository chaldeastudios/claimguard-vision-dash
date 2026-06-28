from core.signals import signal_mutation_module_after_mutating
from .services import FraudScoringService
from .models import FraudScore
import logging

logger = logging.getLogger(__name__)

def on_claim_submitted(sender, **kwargs):
    """
    Signal handler triggered after an openIMIS claim is mutated (submitted).
    Hooks into the OpenIMIS mutation signals to achieve non-monkey-patched integration.
    """
    mutation_class = kwargs.get('mutation_class')
    
    # Only execute scoring on claim submissions
    if mutation_class != 'SubmitClaimMutation':
        return []

    # Skip scoring if the submission encountered errors
    if kwargs.get('error_messages'):
        return []

    # Extract claim data and UUID
    data = kwargs.get('data', {})
    claim_uuid = data.get('uuid')
    
    if not claim_uuid:
        logger.warning("No claim UUID found in SubmitClaimMutation signal data")
        return []

    try:
        # Run scoring service
        result = FraudScoringService.score_claim_by_uuid(claim_uuid)
        
        # Create or update fraud evaluation record
        FraudScore.objects.update_or_create(
            claim_uuid=claim_uuid,
            defaults={
                'score': result['score'],
                'risk_level': result['risk_level'],
                'reasons': result['reasons']
            }
        )
        logger.info(f"Successfully evaluated and scored claim {claim_uuid} with score {result['score']}")
    except Exception as e:
        logger.error(f"Failed to execute claim scoring for {claim_uuid}: {str(e)}")

    return []

def bind_signals():
    """
    Binds the local signal handler to the openIMIS core claims mutation hook.
    """
    signal_mutation_module_after_mutating["claim"].connect(on_claim_submitted)
