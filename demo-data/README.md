# Demo Data

> **`seed.sql` below is legacy and no longer used.** It predates the pivot
> to live openIMIS integration and writes into its own parallel `tblHF`/
> `tblInsuree`/... tables, not the real Django models
> (`location_healthfacility`, `insuree_insuree`, ...) the app actually reads
> over GraphQL. For real demo data, use the Django shell scripts in
> `../scripts/` (`seed_hospitals.py`, plus the existing pattern of ad-hoc
> `manage.py shell` scripts for claims) and `../scripts/seed-accounts.mjs`
> for the hospital/insurer login accounts. Kept here for reference only.

This directory contains seed data for the **ClaimGuard × openIMIS** development environment.

## Contents

| File       | Description                                                                 |
|------------|-----------------------------------------------------------------------------|
| `seed.sql` | SQL script that populates the openIMIS PostgreSQL database with Kenyan demo data |

### What `seed.sql` includes

- **5 healthcare facilities** — Kenyatta National Hospital, Aga Khan University Hospital, Nakuru Level 5 Hospital, Moi Teaching and Referral Hospital, Nairobi Hospital
- **12 insurees** — realistic Kenyan names (Wanjiku Kamau, Omondi Otieno, Amina Hassan, etc.)
- **15 claims** — with KES amounts, ICD-10 diagnosis codes, and various statuses (entered, checked, processed, valuated, rejected)
- **8 fraud score records** — spanning low, medium, high, and critical risk levels

## How to Load

### Option 1 — From host (Docker running)

```bash
docker exec -i openimis-db psql -U postgres -d openimis < demo-data/seed.sql
```

### Option 2 — From inside the database container

```bash
docker exec -it openimis-db bash
psql -U postgres -d openimis -f /demo-data/seed.sql
```

> The `docker-compose.yml` mounts this directory at `/demo-data` inside the `db` container, so the SQL file is already available.

## Notes

- All monetary amounts are in **Kenyan Shillings (KES)**.
- The script uses `CREATE TABLE IF NOT EXISTS` — it is safe to re-run, but `INSERT` statements will fail on duplicate keys if data already exists. Truncate or drop the tables first for a clean reload.
- Requires PostgreSQL 13+ (uses `gen_random_uuid()`).
