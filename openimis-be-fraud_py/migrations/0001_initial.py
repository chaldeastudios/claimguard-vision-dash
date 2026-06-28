import django.db.models.deletion
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='FraudScore',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('uuid', models.CharField(db_index=True, default=None, max_length=36, null=True, unique=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('json_ext', models.JSONField(blank=True, default=dict, null=True)),
                ('date_created', models.DateTimeField(auto_now_add=True, db_index=True, null=True)),
                ('date_updated', models.DateTimeField(auto_now=True, db_index=True, null=True)),
                ('version', models.IntegerField(default=1)),
                ('claim_uuid', models.UUIDField(db_index=True, default=uuid.uuid4, help_text='UUID referencing the core openIMIS Claim record', unique=True)),
                ('score', models.FloatField(help_text='Fraud risk score percentage (0.0 to 100.0)')),
                ('risk_level', models.CharField(choices=[('Low', 'Low Risk'), ('Medium', 'Medium Risk'), ('High', 'High Risk')], default='Low', help_text='Adjudication risk level category', max_length=10)),
                ('reasons', models.JSONField(default=list, help_text='Structured reasons/rules triggered for risk classification')),
                ('scored_at', models.DateTimeField(auto_now_add=True, help_text='Timestamp of risk assessment execution')),
            ],
            options={
                'verbose_name': 'Fraud Score',
                'verbose_name_plural': 'Fraud Scores',
                'db_table': 'claim_fraud_score',
            },
        ),
    ]
