# Backend Scripts (project root scripts)

## migrate-local-to-production.js

Copies all data from your **local** PostgreSQL (this app / dev) to **production** (Railway) so you can use production as your main data store (“me” profile) and keep local as true dev.

### Prerequisites

- Local DB has the data you want to move.
- Production (Railway) has the same schema (run migrations on Railway first if needed).
- You have the production Postgres URL (Railway dashboard → your project → PostgreSQL → Connect → connection string).

### Run

From project root:

```powershell
# Set your Railway Postgres URL (get it from Railway dashboard)
$env:TARGET_DATABASE_URL = "postgresql://postgres:...@...railway.app:5432/railway"

cd backend
node scripts/migrate-local-to-production.js
```

From `backend/`:

```powershell
$env:TARGET_DATABASE_URL = "postgresql://..."
node scripts/migrate-local-to-production.js
```

### What it does

1. Reads from the database configured in `backend/.env` (or `DATABASE_URL` / `DB_*`).
2. Connects to `TARGET_DATABASE_URL` (production).
3. For each of `profiles`, `app_settings`, `daily_logs`, `foods`:
   - Truncates the table on production.
   - Copies all rows from local to production.
   - Resets the `id` sequence so new rows get correct IDs.

After this, production has a full copy of your local data. Use the production app (and “me” profile) for your real data; this local DB is then true dev.
