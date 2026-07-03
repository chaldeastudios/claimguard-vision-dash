# Consolidated login/session fix from the hackathon administrators' doc
# (openIMIS_login_Fix.docx), run inside the backend container:
#
#   docker exec -i openimis-backend python manage.py shell < scripts/fix_admin_login.py
#
# Only touches core.InteractiveUser('Admin') and axes lockout state -- does
# not touch HealthFacility, Claim, or any of the ClaimGuard demo data from
# scripts/seed_hospitals.py / seed-accounts.mjs, so it's safe to run without
# undoing that.
#
# The actual root cause (short session times) was JWT_COOKIE_SECURE=True in
# production mode: the browser silently refuses to send the auth cookie back
# over plain HTTP, which looks exactly like sessions expiring immediately.
# That's fixed in docker-compose.yml (MODE=Dev, JWT_COOKIE_SECURE=False) --
# restart the stack after running this script for that half of the fix to
# take effect.
from django.apps import apps

InteractiveUser = apps.get_model('core', 'InteractiveUser')

print("=== Restoring Admin login ===")
try:
    iu = InteractiveUser.objects.get(login_name='Admin')
    iu.validity_to = None
    iu.set_password('Admin@1234')
    iu.save()
    print(f"  {iu.login_name}: validity_to={iu.validity_to}")
except InteractiveUser.DoesNotExist:
    print("  No InteractiveUser with login_name='Admin' found -- skipping.")
except Exception as e:
    print(f"  Failed to restore Admin: {e!r}")

print("=== Clearing axes lockouts ===")
try:
    from axes.models import AccessAttempt
    count, _ = AccessAttempt.objects.all().delete()
    print(f"  Deleted {count} AccessAttempt row(s).")
except ImportError:
    print("  django-axes isn't installed in this deployment -- nothing to clear.")
except Exception as e:
    print(f"  Failed to clear axes lockouts: {e!r}")

print("=== Done ===")
