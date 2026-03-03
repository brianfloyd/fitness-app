# Fitbit API Setup Guide

This guide walks you through setting up Fitbit OAuth 2.0 and connecting your Fitbit account to the Fitness App.

---

## 1. Create a Fitbit Developer Account

1. Go to [https://dev.fitbit.com](https://dev.fitbit.com)
2. Sign in or create a Fitbit account
3. Accept the Fitbit Developer Terms of Service

---

## 2. Register Your Application

1. Go to [https://dev.fitbit.com/apps/new](https://dev.fitbit.com/apps/new)
2. Fill in the application details:

   | Field | Value |
   |-------|-------|
   | **Application Name** | `Fitness Daily Log` (or your app name) |
   | **Application Type** | **Server** (required for backend OAuth) |
   | **OAuth 2.0 Application Type** | Server |
   | **Callback URL** | See below |
   | **Default Access Type** | Read-Only (or Read & Write if you need to write data) |
   | **Application Description** | e.g. "Sync Fitbit steps and sleep to fitness log" |

3. **Callback URL** – must exactly match where Fitbit redirects after authorization:
   - **Local dev:** `http://localhost:3001/api/fitbit/callback`
   - **Production:** `https://YOUR-BACKEND-DOMAIN/api/fitbit/callback`  
     (e.g. `https://fitness-api.railway.app/api/fitbit/callback`)

4. Click **Register**
5. After registration, you'll see:
   - **OAuth 2.0 Client ID** (e.g. `23ABC1`)
   - **Client Secret** (click "Show" to reveal) – **keep this secret**

---

## 3. Configure Environment Variables

Add these to your backend `.env` file:

```env
# Fitbit OAuth (from https://dev.fitbit.com/apps)
FITBIT_CLIENT_ID=your_client_id_here
FITBIT_CLIENT_SECRET=your_client_secret_here

# Redirect base URL – used for OAuth callback (omit trailing slash)
# Local: http://localhost:3001
# Production: https://your-backend-domain.com
FITBIT_REDIRECT_URI=http://localhost:3001

# Where to send user after OAuth (your frontend)
# Local: http://localhost:5173
# Production: https://your-frontend-domain.com
FRONTEND_URL=http://localhost:5173
```

**Important:**
- `FITBIT_REDIRECT_URI` must be the base URL of your backend (no path). The callback path `/api/fitbit/callback` is added automatically.
- The Callback URL in Fitbit’s app settings must match `{FITBIT_REDIRECT_URI}/api/fitbit/callback` exactly.

---

## 4. Run the Database Migration

Create the `fitbit_tokens` table:

```bash
cd backend
node src/run-all-migrations.js
```

Or run only the Fitbit migration:

```bash
psql -d fitness_db -f database/migrations/add_fitbit_tokens.sql
```

---

## 5. Connect Your Fitbit Account

1. Start the app (frontend and backend)
2. Log in and open **Settings**
3. Go to **Add Device**
4. Click **Connect** next to Fitbit
5. You’ll be redirected to Fitbit’s authorization page
6. Log in and approve access (steps, sleep, heart rate, etc.)
7. You’ll be redirected back to the app with Fitbit connected

---

## 6. Production Checklist

For production (e.g. Railway, Vercel, etc.):

1. **Fitbit app settings**
   - Add your production Callback URL, e.g.  
     `https://your-api.railway.app/api/fitbit/callback`

2. **Environment variables**
   ```env
   FITBIT_CLIENT_ID=...
   FITBIT_CLIENT_SECRET=...
   FITBIT_REDIRECT_URI=https://your-api.railway.app
   FRONTEND_URL=https://your-app.railway.app
   ```

3. **CORS**
   - Ensure your frontend domain is in `CORS_ORIGIN` or `RAILWAY_PUBLIC_DOMAIN`

---

## 7. Scopes Requested

The app requests these Fitbit scopes:

- `activity` – steps, calories burned, active minutes
- `heartrate` – heart rate data
- `profile` – basic profile info
- `sleep` – sleep stages and duration
- `weight` – body weight

You can change scopes in `backend/src/routes/fitbit.js` (the `scope` variable in the auth-url handler).

---

## 8. Token Storage

Tokens are stored in `fitbit_tokens` per profile:

- `access_token` – used for API calls
- `refresh_token` – used to get new access tokens when they expire
- `expires_at` – access token expiry

Access tokens are refreshed automatically when fetching data.

---

## 9. Data Usage

Once connected, the app fetches:

- **Steps** – via `GET /api/fitbit/data?date=YYYY-MM-DD`
- **Sleep** – total sleep minutes for the date

These can be wired into the daily log (e.g. Steps field) and DayCounter stats.

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Fitbit not configured" | Set `FITBIT_CLIENT_ID` and `FITBIT_CLIENT_SECRET` in `.env` |
| Redirect URI mismatch | Callback URL in Fitbit app must exactly match `{FITBIT_REDIRECT_URI}/api/fitbit/callback` |
| "Screen not found" or Safari error when connecting | Use **frontend callback** for dev: set `FITBIT_REDIRECT_URI=https://localhost:5173/fitbit-callback`. Add `https://localhost:5173/fitbit-callback` in [dev.fitbit.com](https://dev.fitbit.com) → your app → Callback URL. For iPhone on same network, use `https://YOUR-LAN-IP:5173/fitbit-callback` (e.g. `https://192.168.1.112:5173/fitbit-callback`) and add that URL to Fitbit too. |
| Dev shows "not connected" but prod works | Dev and prod use different databases. `fitbit_tokens` are stored per DB. Connect Fitbit in dev separately, or ensure dev `.env` has correct `FITBIT_REDIRECT_URI` so OAuth completes. |
| 401 after OAuth | Check that the migration ran and `fitbit_tokens` exists |
| Token refresh fails | Ensure `FITBIT_CLIENT_SECRET` is set; refresh uses the same credentials |

---

## References

- [Fitbit Web API Authorization](https://dev.fitbit.com/build/reference/web-api/oauth2/)
- [Fitbit OAuth 2.0 Tutorial](https://dev.fitbit.com/build/reference/web-api/troubleshooting-guide/oauth2-tutorial/)
- [Fitbit API Scopes](https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/)
