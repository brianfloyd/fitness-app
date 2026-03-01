# OAuth & Email Setup Guide (Reference)

> **Purpose:** Setup instructions for GoDaddy SMTP (fitmyaiway@brianfloyd.me) and Google OAuth.
> **Status:** Reference doc — follow before deploying OAuth/email features.

---

## 1. GoDaddy Email (fitmyaiway@brianfloyd.me)

### 1.1 Create the Email Account

1. Log in to **GoDaddy** → Workspace Email (or Email & Office)
2. Add a new mailbox: **fitmyaiway@brianfloyd.me**
3. Set a strong password and store it securely
4. Confirm the account and that you can send/receive mail

### 1.2 SMTP Settings (for sending)

| Setting | Value |
|--------|--------|
| **Server** | `smtpout.secureserver.net` |
| **Port** | `465` (SSL) or `587` (STARTTLS) |
| **Security** | SSL/TLS |
| **Username** | `fitmyaiway@brianfloyd.me` |
| **Password** | Your mailbox password |
| **Auth** | SMTP Auth required |

**Note:** If using Workspace Email (Microsoft 365), use `smtp.office365.com` port 587 instead.

### 1.3 Environment Variables (Railway / backend/.env)

```env
# Email (GoDaddy SMTP)
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=fitmyaiway@brianfloyd.me
SMTP_PASS=your_mailbox_password
EMAIL_FROM=Fit MyAIWay <fitmyaiway@brianfloyd.me>
```

### 1.4 Sending Limits

- GoDaddy SMTP: typically **250–500 emails/day**
- Sufficient for verification and transactional mail

---

## 2. Google OAuth (Sign in with Google)

### 2.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project (e.g. “Fit MyAIWay”)
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. **Application type:** Web application
5. **Authorized JavaScript origins:**
   - `https://fit.brianfloyd.me`
   - `https://localhost:5173` (dev)
6. **Authorized redirect URIs:**
   - `https://fit.brianfloyd.me` (or `/auth/google/callback` if you use a callback path)
   - `https://localhost:5173` (dev)
7. Copy **Client ID** and **Client Secret**

### 2.2 Environment Variables

```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 2.3 Fitbit / Fit MyAIWay OAuth

Fitbit OAuth is separate and already configured for Fitbit data. Google OAuth is for **user authentication** (sign in with Google).

---

## 3. App Base URL

For verification links and OAuth redirects:

```env
APP_BASE_URL=https://fit.brianfloyd.me
```

In development: `APP_BASE_URL=https://localhost:5173`

---

## 4. Railway Checklist

- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` set
- [ ] `EMAIL_FROM` set
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` set
- [ ] `APP_BASE_URL` set to production URL
- [ ] CORS includes your frontend origin

---

**Last updated:** 2026-02-20
