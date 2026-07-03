# Grants every right_id that exists anywhere in this openIMIS instance to
# the ClaimGuard service account's role (OPENIMIS_USERNAME), plus the
# JHOS0011/E00001 demo accounts used earlier this project. Run inside the
# backend container:
#
#   docker exec -i openimis-backend python manage.py shell < scripts/grant_service_account_rights.py
#
# openIMIS's GraphQL resolvers gate a lot of query/mutation types behind
# specific right_ids on the caller's role -- a blunt "grant everything"
# pass is the fastest way to rule permissions out as the cause of a query
# silently returning nothing (see scripts/diagnose_diagnoses.py). This is a
# demo-environment fix, not something to do against a production scheme.
import os
from django.apps import apps

Role = apps.get_model('core', 'Role')
RoleRight = apps.get_model('core', 'RoleRight')
UserRole = apps.get_model('core', 'UserRole')
InteractiveUser = apps.get_model('core', 'InteractiveUser')

all_rights = sorted(set(RoleRight.objects.values_list('right_id', flat=True)))
print('Total distinct rights in system:', len(all_rights))

service_login = os.environ.get('OPENIMIS_USERNAME')
logins = [l for l in [service_login, 'JHOS0011', 'E00001'] if l]

for login in dict.fromkeys(logins):  # dedupe, keep order
    iu = InteractiveUser.objects.filter(login_name=login).first()
    if not iu:
        print(login, '-> InteractiveUser not found')
        continue
    ur = UserRole.objects.filter(user=iu).first()
    if not ur:
        print(login, '-> no UserRole/role assigned')
        continue
    role = ur.role
    print(f'{login} -> Role {role.id} "{role.name}"')

    existing = set(RoleRight.objects.filter(role=role).values_list('right_id', flat=True))
    missing = [r for r in all_rights if r not in existing]
    print(f'  already has {len(existing)} rights, missing {len(missing)}')

    template = RoleRight.objects.filter(role=role).first()
    if not template:
        print('  no template row found on this role -- skipping (unexpected)')
        continue

    created = 0
    for right_id in missing:
        RoleRight(
            role=role,
            right_id=right_id,
            audit_user_id=getattr(template, 'audit_user_id', None),
            validity_from=getattr(template, 'validity_from', None),
        ).save()
        created += 1
    print(f'  created {created} new RoleRight rows')

    final = sorted(RoleRight.objects.filter(role=role).values_list('right_id', flat=True))
    print(f'  final right count for role {role.id}: {len(final)}')
