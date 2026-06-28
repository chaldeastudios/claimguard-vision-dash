import graphene
from graphene_django import DjangoObjectType
from .models import FraudScore
from django.db.models import Count, Avg, Sum
from core.schema import OrderedDjangoFilterConnectionField

class FraudScoreType(DjangoObjectType):
    """
    Graphene-Django object representation for the FraudScore model.
    """
    class Meta:
        model = FraudScore
        interfaces = (graphene.relay.Node,)
        filter_fields = {
            'claim_uuid': ['exact'],
            'risk_level': ['exact', 'icontains'],
            'score': ['exact', 'gte', 'lte']
        }

class FraudStatsType(graphene.ObjectType):
    """
    Object type conveying statistical analytics for the ClaimGuard dashboard.
    """
    total_claims_scored = graphene.Int()
    high_risk_percentage = graphene.Float()
    estimated_kes_at_risk = graphene.Float()
    average_fraud_score = graphene.Float()

class Query(graphene.ObjectType):
    """
    GraphQL queries exposed to openIMIS.
    """
    fraud_score_by_claim = graphene.Field(
        FraudScoreType, 
        claim_uuid=graphene.UUID(required=True),
        description="Fetch fraud score assessment details for a specific claim UUID"
    )
    fraud_scores_queue = OrderedDjangoFilterConnectionField(
        FraudScoreType,
        risk_level=graphene.String(),
        description="Filter and page through the queue of fraud scores"
    )
    fraud_dashboard_stats = graphene.Field(
        FraudStatsType,
        description="Aggregated key performance statistics for claims risk auditing"
    )

    def resolve_fraud_score_by_claim(self, info, claim_uuid):
        try:
            return FraudScore.objects.get(claim_uuid=claim_uuid)
        except FraudScore.DoesNotExist:
            return None

    def resolve_fraud_scores_queue(self, info, **kwargs):
        risk_level = kwargs.get('risk_level')
        queryset = FraudScore.objects.filter(is_deleted=False)
        if risk_level:
            queryset = queryset.filter(risk_level=risk_level)
        return queryset.order_by('-score')

    def resolve_fraud_dashboard_stats(self, info):
        queryset = FraudScore.objects.filter(is_deleted=False)
        total = queryset.count()
        
        if total == 0:
            return FraudStatsType(
                total_claims_scored=0,
                high_risk_percentage=0.0,
                estimated_kes_at_risk=0.0,
                average_fraud_score=0.0
            )

        high_risk_count = queryset.filter(risk_level='High').count()
        avg_score = queryset.aggregate(Avg('score'))['score__avg'] or 0.0
        
        # Calculate estimated KES values by joining Claim database records (mock fallback logic)
        # In a real environment, query core claim totals
        estimated_kes = 2500000.00 # Placeholder for demo analytics

        return FraudStatsType(
            total_claims_scored=total,
            high_risk_percentage=(high_risk_count / total) * 100.0,
            estimated_kes_at_risk=estimated_kes,
            average_fraud_score=avg_score
        )
