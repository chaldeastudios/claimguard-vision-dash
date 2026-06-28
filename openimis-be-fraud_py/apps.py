from django.apps import AppConfig


class FraudConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'fraud'

    def ready(self):
        from .signals import bind_signals
        bind_signals()
