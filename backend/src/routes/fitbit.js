import express from 'express';
import crypto from 'crypto';
import pool from '../db/connection.js';
import { requireProfileId } from '../middleware/requireProfileId.js';

const router = express.Router();

const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
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
  const redirectUri = baseUrl.replace(/\/$/, '') + '/api/fitbit/callback';

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

// GET /api/fitbit/callback - Fitbit redirects here (no requireProfileId - we get profileId from state)
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

  let profileId, verifier;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    profileId = decoded.profileId;
    verifier = decoded.verifier;
  } catch (e) {
    return res.redirect(`${frontendUrl}/?fitbit_error=invalid_state`);
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.redirect(`${frontendUrl}/?fitbit_error=not_configured`);
  }

  const redirectUri =
    (process.env.FITBIT_REDIRECT_URI || baseUrl).replace(/\/$/, '') + '/api/fitbit/callback';

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
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
      return res.redirect(`${frontendUrl}/?fitbit_error=token_failed`);
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

    return res.redirect(`${frontendUrl}/?fitbit_connected=1`);
  } catch (err) {
    console.error('[fitbit] Callback error:', err);
    return res.redirect(`${frontendUrl}/?fitbit_error=server_error`);
  }
});

// GET /api/fitbit/status - check if connected (requires profileId)
router.get('/status', requireProfileId, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT 1 FROM fitbit_tokens WHERE profile_id = $1',
      [req.profileId]
    );
    res.json({ connected: r.rows.length > 0 });
  } catch (err) {
    console.error('[fitbit] Status error:', err);
    res.status(500).json({ error: 'Failed to check status', connected: false });
  }
});

// GET /api/fitbit/data - fetch steps/sleep for a date (requires profileId)
router.get('/data', requireProfileId, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });

  try {
    const tokenRow = await pool.query(
      'SELECT access_token, refresh_token, expires_at FROM fitbit_tokens WHERE profile_id = $1',
      [req.profileId]
    );
    if (tokenRow.rows.length === 0) {
      return res.json({ steps: null, sleep: null, connected: false });
    }

    let accessToken = tokenRow.rows[0].access_token;
    const refreshToken = tokenRow.rows[0].refresh_token;
    let expiresAt = tokenRow.rows[0].expires_at;

    if (new Date(expiresAt) <= new Date(Date.now() + 60 * 1000)) {
      const clientId = process.env.FITBIT_CLIENT_ID;
      const clientSecret = process.env.FITBIT_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.json({ steps: null, sleep: null, connected: false });
      }
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
      if (!refreshRes.ok) {
        return res.json({ steps: null, sleep: null, connected: false });
      }
      accessToken = refreshData.access_token;
      const newExpires = new Date(Date.now() + (refreshData.expires_in || 28800) * 1000);
      await pool.query(
        'UPDATE fitbit_tokens SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW() WHERE profile_id = $4',
        [refreshData.access_token, refreshData.refresh_token || refreshToken, newExpires, req.profileId]
      );
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

export default router;
