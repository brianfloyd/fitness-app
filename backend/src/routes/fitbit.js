import express from 'express';
import crypto from 'crypto';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';
import { requireProfileId } from '../middleware/requireProfileId.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function getRedirectUri() {
  const base = process.env.FITBIT_REDIRECT_URI;
  if (!base) return null;
  const trimmed = base.replace(/\/$/, '');
  // If already a full callback path (e.g. https://localhost:5173/fitbit-callback for frontend flow), use as-is
  if (trimmed.includes('/fitbit-callback')) return trimmed;
  return trimmed + '/api/fitbit/callback';
}

// GET /api/fitbit/auth-url - returns OAuth URL (requires profileId)
router.get('/auth-url', requireProfileId, (req, res) => {
  const clientId = process.env.FITBIT_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({
      error: 'Fitbit not configured',
      details: 'FITBIT_CLIENT_ID is not set. See docs/FITBIT-SETUP.md',
    });
  }

  const { verifier, challenge } = generatePKCE();
  const state = Buffer.from(JSON.stringify({ profileId: req.profileId, verifier })).toString('base64url');

  const baseUrl = process.env.FITBIT_REDIRECT_URI || (req.protocol + '://' + req.get('host'));
  const redirectUri = getRedirectUri() || (baseUrl.replace(/\/$/, '') + '/api/fitbit/callback');

  const scope = 'activity heartrate profile sleep weight';
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope,
    redirect_uri: redirectUri,
    state,
  });

  res.json({ url: `${FITBIT_AUTH_URL}?${params}` });
});

async function exchangeFitbitCode(code, state, redirectUri) {
  let profileId, verifier;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    profileId = decoded.profileId;
    verifier = decoded.verifier;
  } catch (e) {
    return { error: 'invalid_state' };
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { error: 'not_configured' };

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: body.toString(),
  });

  const data = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('[fitbit] Token error:', data);
    return { error: 'token_failed' };
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 28800) * 1000);
  await pool.query(
    `INSERT INTO fitbit_tokens (profile_id, access_token, refresh_token, expires_at, fitbit_user_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (profile_id) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       expires_at = EXCLUDED.expires_at,
       fitbit_user_id = EXCLUDED.fitbit_user_id,
       updated_at = NOW()`,
    [profileId, data.access_token, data.refresh_token, expiresAt, data.user_id || null]
  );

  const summaryPath = join(__dirname, '../../../docs/fitbit-payload-summary.md');
  const sanitized = { ...data };
  if (sanitized.access_token) sanitized.access_token = '[REDACTED]';
  if (sanitized.refresh_token) sanitized.refresh_token = '[REDACTED]';
  const md = `# Fitbit OAuth Payload Summary

Generated: ${new Date().toISOString()}
Profile ID: ${profileId}

## Token Response Fields

| Field | Value |
|-------|-------|
| user_id | ${sanitized.user_id ?? '—'} |
| token_type | ${sanitized.token_type ?? '—'} |
| expires_in | ${sanitized.expires_in ?? '—'} seconds |
| scope | ${sanitized.scope ?? '—'} |
| access_token | ${sanitized.access_token ?? '—'} |
| refresh_token | ${sanitized.refresh_token ?? '—'} |

## Raw Payload (sanitized)

\`\`\`json
${JSON.stringify(sanitized, null, 2)}
\`\`\`
`;
  try {
    writeFileSync(summaryPath, md);
  } catch (e) {
    console.warn('[fitbit] Could not write payload summary:', e.message);
  }
  return { ok: true };
}

// POST /api/fitbit/complete-callback - frontend calls after Fitbit redirects to /fitbit-callback (fixes Safari/mobile dev)
router.post('/complete-callback', async (req, res) => {
  const { code, state } = req.body || {};
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code || !state) {
    return res.json({ error: 'missing_params' });
  }

  const baseUrl = process.env.FITBIT_REDIRECT_URI || '';
  const redirectUri = getRedirectUri() || (baseUrl.replace(/\/$/, '') + '/fitbit-callback');

  try {
    const result = await exchangeFitbitCode(code, state, redirectUri);
    if (result.error) {
      return res.json({ error: result.error });
    }
    return res.json({ ok: true, redirect: `${frontendUrl}/?fitbit_connected=1` });
  } catch (err) {
    console.error('[fitbit] complete-callback error:', err);
    return res.json({ error: 'server_error' });
  }
});

// GET /api/fitbit/callback - Fitbit redirects here when using backend URL (no requireProfileId)
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const baseUrl = req.protocol + '://' + req.get('host');
  const frontendUrl = process.env.FRONTEND_URL || baseUrl.replace(/3001/, '5173').replace(/3000/, '5173');

  if (error) {
    console.error('[fitbit] OAuth error:', error);
    return res.redirect(`${frontendUrl}/?fitbit_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/?fitbit_error=missing_params`);
  }

  const redirectUri =
    getRedirectUri() || (baseUrl.replace(/\/$/, '') + '/api/fitbit/callback');

  try {
    const result = await exchangeFitbitCode(code, state, redirectUri);
    if (result.error) {
      return res.redirect(`${frontendUrl}/?fitbit_error=${result.error}`);
    }
    return res.redirect(`${frontendUrl}/?fitbit_connected=1`);
  } catch (err) {
    console.error('[fitbit] Callback error:', err);
    return res.redirect(`${frontendUrl}/?fitbit_error=server_error`);
  }
});

// GET /api/fitbit/status - check if connected (requires profileId), validates token with Fitbit, writes payload summary when connected
router.get('/status', requireProfileId, async (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[fitbit] status check for profile', req.profileId);
  }
  try {
    const r = await pool.query(
      'SELECT access_token, fitbit_user_id, expires_at FROM fitbit_tokens WHERE profile_id = $1',
      [req.profileId]
    );
    if (r.rows.length === 0) {
      return res.json({ connected: false });
    }

    const profileRes = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
      headers: { Authorization: `Bearer ${r.rows[0].access_token}` },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[fitbit] Fitbit profile API status:', profileRes.status);
    }

    if (!profileRes.ok || profileRes.status === 401 || profileRes.status === 403) {
      await pool.query('DELETE FROM fitbit_tokens WHERE profile_id = $1', [req.profileId]);
      if (process.env.NODE_ENV === 'development') {
        console.log('[fitbit] Token invalid (status', profileRes.status, '), cleared for profile', req.profileId);
      }
      return res.json({ connected: false });
    }

    // Build and write payload summary from DB + Fitbit profile (no token values)
    const profileData = await profileRes.json().catch(() => ({}));
    const row = r.rows[0];
    const scope = 'activity heartrate profile sleep weight';
    const md = `# Fitbit OAuth Payload Summary

Generated: ${new Date().toISOString()}
Profile ID: ${req.profileId}

## Token Info (from DB)

| Field | Value |
|-------|-------|
| fitbit_user_id | ${row.fitbit_user_id ?? '—'} |
| expires_at | ${row.expires_at ?? '—'} |
| token_type | Bearer |
| scope | ${scope} |
| access_token | [REDACTED] |
| refresh_token | [REDACTED] |

## Fitbit Profile (from API)

| Field | Value |
|-------|-------|
| displayName | ${profileData.user?.displayName ?? '—'} |
| fullName | ${profileData.user?.fullName ?? '—'} |
| encodedId | ${profileData.user?.encodedId ?? '—'} |

## Raw Profile Response

\`\`\`json
${JSON.stringify(profileData, null, 2)}
\`\`\`
`;
    const summaryPath = join(__dirname, '../../../docs/fitbit-payload-summary.md');
    try {
      writeFileSync(summaryPath, md);
      if (process.env.NODE_ENV === 'development') {
        console.log('[fitbit] Wrote payload summary to docs/fitbit-payload-summary.md');
      }
    } catch (e) {
      console.warn('[fitbit] Could not write payload summary:', e.message);
    }

    res.json({ connected: true });
  } catch (err) {
    console.error('[fitbit] Status error:', err);
    res.status(500).json({ error: 'Failed to check status', connected: false });
  }
});

async function getValidAccessToken(profileId) {
  const tokenRow = await pool.query(
    'SELECT access_token, refresh_token, expires_at FROM fitbit_tokens WHERE profile_id = $1',
    [profileId]
  );
  if (tokenRow.rows.length === 0) return null;

  let accessToken = tokenRow.rows[0].access_token;
  const refreshToken = tokenRow.rows[0].refresh_token;
  const expiresAt = tokenRow.rows[0].expires_at;

  if (new Date(expiresAt) <= new Date(Date.now() + 60 * 1000)) {
    const clientId = process.env.FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const refreshRes = await fetch(FITBIT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: body.toString(),
    });
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok) return null;
    accessToken = refreshData.access_token;
    const newExpires = new Date(Date.now() + (refreshData.expires_in || 28800) * 1000);
    await pool.query(
      'UPDATE fitbit_tokens SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW() WHERE profile_id = $4',
      [refreshData.access_token, refreshData.refresh_token || refreshToken, newExpires, profileId]
    );
  }
  return accessToken;
}

// GET /api/fitbit/data - fetch steps/sleep for a date (requires profileId)
router.get('/data', requireProfileId, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });

  try {
    const accessToken = await getValidAccessToken(req.profileId);
    if (!accessToken) {
      return res.json({ steps: null, sleep: null, connected: false });
    }

    const baseDate = date.replace(/-/g, '/');
    const [stepsRes, sleepRes] = await Promise.all([
      fetch(`https://api.fitbit.com/1/user/-/activities/steps/date/${baseDate}/1d.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${baseDate}.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    let steps = null;
    let sleepMinutes = null;

    if (stepsRes.ok) {
      const stepsData = await stepsRes.json();
      const sum = stepsData['activities-steps']?.reduce((a, d) => a + (parseInt(d.value, 10) || 0), 0);
      if (sum != null) steps = sum;
    }
    if (sleepRes.ok) {
      const sleepData = await sleepRes.json();
      const total = sleepData.summary?.totalMinutesAsleep;
      if (total != null) sleepMinutes = total;
    }

    res.json({ steps, sleepMinutes, connected: true });
  } catch (err) {
    console.error('[fitbit] Data fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch Fitbit data' });
  }
});

// GET /api/fitbit/daily-metrics - fetch all Fitbit daily metrics for a date (requires profileId)
router.get('/daily-metrics', requireProfileId, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });

  try {
    const accessToken = await getValidAccessToken(req.profileId);
    if (!accessToken) {
      return res.json({ connected: false, metrics: null });
    }

    // Fitbit API requires yyyy-MM-dd format
    const fitbitDate = date.includes('/') ? date.replace(/\//g, '-') : date;
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [activityRes, sleepRes, azmRes] = await Promise.all([
      fetch(`https://api.fitbit.com/1/user/-/activities/date/${fitbitDate}.json`, { headers }),
      fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${fitbitDate}.json`, { headers }),
      fetch(`https://api.fitbit.com/1/user/-/activities/active-zone-minutes/date/${fitbitDate}/${fitbitDate}.json`, { headers }),
    ]);

    if (process.env.NODE_ENV === 'development') {
      const aErr = activityRes.ok ? null : await activityRes.text();
      const sErr = sleepRes.ok ? null : await sleepRes.text();
      const zErr = azmRes.ok ? null : await azmRes.text();
      if (!activityRes.ok || !sleepRes.ok || !azmRes.ok) {
        console.log('[fitbit] daily-metrics errors:', { date: fitbitDate, activity: activityRes.status, aErr: aErr?.slice(0, 200), sleep: sleepRes.status, sErr: sErr?.slice(0, 200), azm: azmRes.status, zErr: zErr?.slice(0, 200) });
      }
    }

    let activity = activityRes.ok ? await activityRes.json() : null;
    const sleep = sleepRes.ok ? await sleepRes.json() : null;
    const azm = azmRes.ok ? await azmRes.json() : null;

    // Fallback: if activity summary failed, try steps endpoint for at least steps
    let stepsFallback = null;
    if (!activity) {
      const stepsRes = await fetch(`https://api.fitbit.com/1/user/-/activities/steps/date/${fitbitDate}/1d.json`, { headers });
      if (stepsRes.ok) {
        const stepsData = await stepsRes.json();
        const sum = stepsData['activities-steps']?.reduce((a, d) => a + (parseInt(d.value, 10) || 0), 0);
        if (sum != null) stepsFallback = sum;
      }
    }

    const summary = activity?.summary || {};
    const goals = activity?.goals || {};
    const azmVal = azm?.['activities-active-zone-minutes']?.[0]?.value || {};

    const mainSleep = sleep?.sleep?.find((s) => s.isMainSleep) || sleep?.sleep?.[0];
    const sleepSummary = sleep?.summary || {};

    const metrics = {
      // Activity
      steps: summary.steps ?? stepsFallback ?? null,
      floors: summary.floors ?? null,
      elevation: summary.elevation ?? null,
      caloriesOut: summary.caloriesOut ?? null,
      activityCalories: summary.activityCalories ?? null,
      sedentaryMinutes: summary.sedentaryMinutes ?? null,
      lightlyActiveMinutes: summary.lightlyActiveMinutes ?? null,
      fairlyActiveMinutes: summary.fairlyActiveMinutes ?? null,
      veryActiveMinutes: summary.veryActiveMinutes ?? null,
      restingHeartRate: summary.restingHeartRate ?? null,
      distance: summary.distances?.find((d) => d.activity === 'total')?.distance ?? null,
      // Goals
      goals: {
        steps: goals.steps ?? null,
        floors: goals.floors ?? null,
        caloriesOut: goals.caloriesOut ?? null,
        activeMinutes: goals.activeMinutes ?? null,
      },
      // Active Zone Minutes
      activeZoneMinutes: azmVal.activeZoneMinutes ?? null,
      fatBurnMinutes: azmVal.fatBurnActiveZoneMinutes ?? null,
      cardioMinutes: azmVal.cardioActiveZoneMinutes ?? null,
      peakMinutes: azmVal.peakActiveZoneMinutes ?? null,
      // Sleep
      totalMinutesAsleep: sleepSummary.totalMinutesAsleep ?? null,
      totalTimeInBed: sleepSummary.totalTimeInBed ?? null,
      sleepEfficiency: mainSleep?.efficiency ?? null,
      deepMinutes: mainSleep?.levels?.summary?.deep?.minutes ?? sleepSummary.stages?.deep ?? null,
      lightMinutes: mainSleep?.levels?.summary?.light?.minutes ?? sleepSummary.stages?.light ?? null,
      remMinutes: mainSleep?.levels?.summary?.rem?.minutes ?? sleepSummary.stages?.rem ?? null,
      wakeMinutes: mainSleep?.levels?.summary?.wake?.minutes ?? sleepSummary.stages?.wake ?? null,
    };

    res.json({ connected: true, metrics, raw: { activity, sleep, azm } });
  } catch (err) {
    console.error('[fitbit] Daily metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch Fitbit daily metrics', connected: false, metrics: null });
  }
});

/** Sync weight and body fat to Fitbit when user saves daily log. Call after successful save; errors are logged, not thrown. */
export async function syncBodyToFitbit(profileId, date, weight, fatPercent) {
  const w = weight != null && weight !== '' ? parseFloat(weight) : null;
  const f = fatPercent != null && fatPercent !== '' ? parseFloat(fatPercent) : null;
  if ((w == null || isNaN(w)) && (f == null || isNaN(f))) return;

  try {
    const accessToken = await getValidAccessToken(profileId);
    if (!accessToken) return;

    const fitbitDate = (date || '').includes('/') ? date.replace(/\//g, '-') : (date || '');
    if (!fitbitDate) return;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Length': '0',
    };

    if (w != null && !isNaN(w) && w > 0) {
      const weightRes = await fetch(
        `https://api.fitbit.com/1/user/-/body/log/weight.json?weight=${encodeURIComponent(w)}&date=${fitbitDate}`,
        { method: 'POST', headers }
      );
      if (!weightRes.ok) {
        const errText = await weightRes.text();
        console.warn('[fitbit] Weight sync failed:', weightRes.status, errText?.slice(0, 100));
      }
    }

    if (f != null && !isNaN(f) && f >= 0 && f <= 100) {
      const fatRes = await fetch(
        `https://api.fitbit.com/1/user/-/body/log/fat.json?fat=${encodeURIComponent(f)}&date=${fitbitDate}`,
        { method: 'POST', headers }
      );
      if (!fatRes.ok) {
        const errText = await fatRes.text();
        console.warn('[fitbit] Body fat sync failed:', fatRes.status, errText?.slice(0, 100));
      }
    }
  } catch (err) {
    console.warn('[fitbit] syncBodyToFitbit error:', err.message);
  }
}

export default router;
