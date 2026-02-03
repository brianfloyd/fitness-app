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

## 3. Enable GitHub Auto-Deploy (Optional)

To trigger deploys on `git push origin main`:

1. Select **fitness-app** service → **Settings**
2. Under **Source**, connect **GitHub** and select **brianfloyd/fitness-app**
3. Set branch to `main` and enable **Deploy on Push**

## 4. Future Deploys

- **CLI:** `railway up --service fitness-app`
- **GitHub:** After connecting in step 3, `git push origin main` triggers deploy

Migrations run automatically on each deploy (startCommand includes `npm run migrate-all`).
