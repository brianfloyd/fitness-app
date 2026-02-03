# Railway Setup Steps (Manual)

Complete these steps in the Railway dashboard to finish deployment.

## 1. Add App Service from GitHub

1. Go to [railway.app](https://railway.app) → Project **fitness-app**
2. Click **+ New** → **GitHub Repo**
3. Select **brianfloyd/fitness-app**
4. Enable **Deploy on Push** for branch `main`

## 2. Link Postgres to App Service

1. Select the **app service** (from GitHub)
2. Go to **Variables** tab
3. Click **+ New Variable** → **Add Reference**
4. Select **Postgres** service → choose **DATABASE_URL**
5. Add variable: `NODE_ENV` = `production`
6. Add variable: `USDA_API_KEY` = (your USDA API key)

## 3. Generate Public Domain

1. Select the **app service**
2. Go to **Settings** → **Networking**
3. Click **Generate Domain** (creates `xxx.up.railway.app`)

## 4. Deploy

Push to trigger deploy (or it will deploy automatically after GitHub connection):

```bash
git add .
git commit -m "Railway production deployment config"
git push origin main
```

Migrations run automatically on each deploy (startCommand includes `npm run migrate-all`).
