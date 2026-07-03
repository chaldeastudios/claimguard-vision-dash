# Checks whether the 3 demo hospitals from scripts/seed_hospitals.py are
# still in openIMIS. Run inside the backend container:
#
#   docker exec -i openimis-backend python manage.py shell < scripts/verify_hospitals.py
#
# If anything is reported MISSING, scripts/seed_hospitals.py is safe to
# re-run -- it uses get_or_create keyed on facility code, so it only creates
# what's actually missing and leaves existing rows untouched.
from django.apps import apps

HealthFacility = apps.get_model('location', 'HealthFacility')
Claim = apps.get_model('claim', 'Claim')

EXPECTED = [
    ('KNH901', 'Kenyatta National Hospital'),
    ('AKU902', 'Aga Khan University Hospital'),
    ('NKR903', 'Nakuru Level 5 Hospital'),
]

print("=== Demo hospitals ===")
missing = False
for code, name in EXPECTED:
    hf = HealthFacility.objects.filter(code=code).first()
    if hf:
        print(f"  OK      {name} ({code}) -> uuid={hf.uuid}")
    else:
        print(f"  MISSING {name} ({code})")
        missing = True

print()
print(f"=== Claims ===")
print(f"  Total claims in openIMIS: {Claim.objects.count()}")

print()
if missing:
    print("Some hospitals are missing -- re-run scripts/seed_hospitals.py to recreate them.")
else:
    print("All demo hospitals are present.")
