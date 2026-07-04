# Renames the demo reviewer account JHOS0011 -> CHALDEA (Team Chaldea
# Studios), run inside the backend container:
#
#   docker-compose exec -T backend python manage.py shell < scripts/rename_reviewer_account.py
#
# Follows the same InteractiveUser.set_password() pattern already confirmed
# working by fix_admin_login.py. Only touches login_name/other_names/
# last_name/password on this one row -- role, region, and district
# assignments (Claim Administrator / Region 1 / Jambero) are untouched.
from django.apps import apps

InteractiveUser = apps.get_model('core', 'InteractiveUser')

OLD_LOGIN = 'JHOS0011'
NEW_LOGIN = 'CHALDEA'
NEW_PASSWORD = 'chaldea1234'
NEW_OTHER_NAMES = 'Team'
NEW_LAST_NAME = 'Chaldea Studios'

try:
    iu = InteractiveUser.objects.get(login_name=OLD_LOGIN)
    iu.login_name = NEW_LOGIN
    iu.other_names = NEW_OTHER_NAMES
    iu.last_name = NEW_LAST_NAME
    iu.set_password(NEW_PASSWORD)
    iu.save()
    print(f"Updated: login_name={iu.login_name}, other_names={iu.other_names}, last_name={iu.last_name}")
except InteractiveUser.DoesNotExist:
    print(f"No InteractiveUser with login_name='{OLD_LOGIN}' found -- nothing changed.")
