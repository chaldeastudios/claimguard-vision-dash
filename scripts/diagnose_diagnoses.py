# Diagnoses the hospital portal's "no diagnoses" symptom. Run inside the
# backend container:
#
#   docker exec -i openimis-backend python manage.py shell < scripts/diagnose_diagnoses.py
#
# Checks two independent causes for the same symptom (an empty catalog and
# a permission-denied GraphQL error both render as "nothing loaded" in the
# UI, see the hospital-portal.tsx fix that now surfaces the real error):
#   1. Is medical.Diagnosis actually empty in this database?
#   2. Does the ClaimGuard service account's role have whatever right the
#      diagnoses GraphQL query requires?
import os
from django.apps import apps

Diagnosis = apps.get_model('medical', 'Diagnosis')
Item = apps.get_model('medical', 'Item')
Service = apps.get_model('medical', 'Service')
InteractiveUser = apps.get_model('core', 'InteractiveUser')
UserRole = apps.get_model('core', 'UserRole')
RoleRight = apps.get_model('core', 'RoleRight')

print("=== Reference data counts ===")
print(f"  Diagnosis: {Diagnosis.objects.count()}")
print(f"  Item:      {Item.objects.count()}")
print(f"  Service:   {Service.objects.count()}")

print()
print("=== medical app's own GraphQL permission config (if any) ===")
try:
    from medical.apps import MedicalConfig
    for attr in dir(MedicalConfig):
        if 'perm' in attr.lower() and not attr.startswith('_'):
            print(f"  MedicalConfig.{attr} = {getattr(MedicalConfig, attr)}")
except Exception as e:
    print(f"  Couldn't inspect MedicalConfig: {e!r}")

print()
print("=== Service account role rights ===")
service_login = os.environ.get('OPENIMIS_USERNAME')
logins_to_check = [l for l in [service_login, 'JHOS0011', 'E00001'] if l]
for login in dict.fromkeys(logins_to_check):  # dedupe, keep order
    iu = InteractiveUser.objects.filter(login_name=login).first()
    if not iu:
        print(f"  {login}: InteractiveUser not found")
        continue
    ur = UserRole.objects.filter(user=iu).first()
    if not ur:
        print(f"  {login}: no role assigned")
        continue
    rights = sorted(RoleRight.objects.filter(role=ur.role).values_list('right_id', flat=True))
    print(f"  {login} -> role '{ur.role.name}', {len(rights)} rights")

print()
print("If Diagnosis count is 0, the catalog is genuinely empty -- load openIMIS's")
print("ICD-10 reference fixture. If counts are >0 but the app still shows nothing,")
print("it's very likely a permission gap -- run scripts/grant_service_account_rights.py,")
print("or check the actual GraphQL error now surfaced by the hospital portal's toast.")
