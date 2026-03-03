# Railway Setup Steps (Manual)

Complete these steps in the Railway dashboard to finish deployment.

**Project:** [fitness-app](https://railway.com/project/a2cc41cd-88a1-409f-add9-d6804736ff94)

## 1. Link Postgres to App Service

1. Go to [railway.app](https://railway.app) → Project **fitness-app**
2. Select the **fitness-app** service (app, not Postgres)
3. Go to **Variables** tab
3. Click **+ New Variable** → **Add Reference**
4. Select **Postgres** service → choose **DATABASE_URL**
5. Add variable: `NODE_ENV` = `production`
6. Add variable: `USDA_API_KEY` = (your USDA API key)

## 2. Generate Public Domain

1. Select the **fitness-app** service
2. Go to **Settings** → **Networking**
3. Click **Generate Domain** (creates `xxx.up.railway.app`)

## 3. GitHub Actions Auto-Deploy (Recommended)

To trigger deploys on `git push origin main`:

1. Create a **Project Token** in Railway: Project **fitness-app** → **Settings** → **Tokens** → **Create Token**
2. Add the token to GitHub: Repo **brianfloyd/fitness-app** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → Name: `RAILWAY_TOKEN`, Value: (paste token)
3. The workflow `.github/workflows/deploy-railway.yml` runs `railway up` on every push to `main`

## 4. Future Deploys

- **Auto:** Push to `main` triggers GitHub Action → `railway up`
- **Manual CLI:** `railway up --service fitness-app`

**Migrations:** The backend runs all migrations automatically on every startup (local and Railway). No separate migrate step or custom start command is required. Ensure the app service has `DATABASE_URL` (Postgres reference) so migrations can run before the server listens.
