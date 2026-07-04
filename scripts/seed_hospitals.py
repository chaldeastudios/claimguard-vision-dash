# Creates the demo hospitals used by the multi-tenant hospital/insurer
# accounts feature. Run inside the backend container, same as the earlier
# create_and_score_claims.py / grant_all_rights.py scripts this session:
#
#   docker exec -i openimis-backend python manage.py shell < scripts/seed_hospitals.py
#
# Rather than guessing HealthFacility's required FK fields (location,
# legal_form, sub_level, ...) blindly, this clones an existing facility row
# as a template and only overrides the identifying fields -- guarantees
# every required FK is a valid reference instead of a guess that fails (or
# worse, half-succeeds) against this specific deployment's reference data.
from django.apps import apps

HealthFacility = apps.get_model('location', 'HealthFacility')

try:
    template = HealthFacility.objects.filter(validity_to__isnull=True).first()
except Exception:
    template = None
if template is None:
    template = HealthFacility.objects.first()
if template is None:
    raise SystemExit(
        "No existing HealthFacility found to use as a template -- this deployment "
        "has no reference data loaded (location, legal form, ...) for a new facility "
        "to safely borrow. Load openIMIS's demo/reference data first."
    )

template_fields = {
    f.name: getattr(template, f.name)
    for f in HealthFacility._meta.get_fields()
    if not f.is_relation or f.many_to_one
}
for skip in ('id', 'uuid', 'code', 'name', 'address', 'phone', 'date_created', 'date_updated'):
    template_fields.pop(skip, None)

HOSPITALS = [
    ('KNH901', 'Kenyatta National Hospital', 'Hospital Rd, Nairobi', '+254 20 2726300'),
    ('AKU902', 'Aga Khan University Hospital', '3rd Parklands Ave, Nairobi', '+254 20 3662000'),
    ('NKR903', 'Nakuru Level 5 Hospital', 'Hospital Rd, Nakuru', '+254 51 2211691'),
    ('MTRH904', 'Moi Teaching and Referral Hospital', 'Nandi Rd, Eldoret', '+254 53 2033471'),
    ('CGTRH905', 'Coast General Teaching and Referral Hospital', 'Kisauni Rd, Mombasa', '+254 41 2314201'),
    ('MMH906', 'Mater Misericordiae Hospital', 'Dunga Rd, Nairobi', '+254 20 6613000'),
]

print("=" * 70)
print("HOSPITAL FACILITY UUIDS -- paste these into scripts/seed-organizations.mjs")
print("=" * 70)
for code, name, address, phone in HOSPITALS:
    hf, created = HealthFacility.objects.get_or_create(
        code=code,
        defaults={**template_fields, 'name': name, 'address': address, 'phone': phone},
    )
    print(f"{name} -> {hf.uuid}  ({'created' if created else 'already existed'})")
print("=" * 70)
