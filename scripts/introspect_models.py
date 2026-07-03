# Dumps every Django model's field list for a curated set of openIMIS
# modules relevant to a white-label frontend (insurees/families, policies,
# contributions, products, locations, plus claim for reference). The backend
# container doesn't have this repo mounted, so pipe it in via stdin from the
# host instead (-T disables the pseudo-tty so the pipe behaves):
#
#   docker-compose exec -T backend python manage.py shell < scripts/introspect_models.py

from django.apps import apps

TARGET_APPS = [
    "insuree",
    "policy",
    "contribution",
    "contribution_plan",
    "product",
    "location",
    "claim",
    "claim_batch",
    "payer",
    "payment",
    "policyholder",
    "contract",
    "invoice",
    "individual",
    "social_protection",
]

for app_label in TARGET_APPS:
    try:
        config = apps.get_app_config(app_label)
    except LookupError:
        print(f"=== {app_label}: NOT INSTALLED ===\n")
        continue

    models = list(config.get_models())
    print(f"=== {app_label} ({len(models)} models) ===")
    for model in models:
        fields = []
        for f in model._meta.get_fields():
            if f.is_relation:
                target = f.related_model.__name__ if f.related_model else "?"
                kind = "FK" if f.many_to_one else "M2M" if f.many_to_many else "rev" if f.one_to_many or f.one_to_one else "?"
                fields.append(f"{f.name}[{kind}->{target}]")
            else:
                fields.append(f"{f.name}:{f.get_internal_type()}")
        print(f"  {model.__name__}: {', '.join(fields)}")
    print()
