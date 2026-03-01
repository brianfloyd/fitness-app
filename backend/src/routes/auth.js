import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db/connection.js';

const router = express.Router();
const client = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

// GET /api/auth/config - public config for frontend (client ID only)
router.get('/config', (req, res) => {
  const id = process.env.GOOGLE_CLIENT_ID || null;
  // Debug: include whether var is present (helps troubleshoot Railway env)
  const debug = process.env.NODE_ENV === 'development' || req.query.debug === '1';
  const payload = { googleClientId: id };
  if (debug) {
    payload._debug = {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  res.json(payload);
});

// POST /api/auth/google - verify Google ID token and sign in
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential required' });
    }

    if (!client || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google OAuth not configured' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email?.split('@')[0] || 'user';

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Invalid Google token: missing email' });
    }

    // Find existing profile by google_id or email
    let result = await pool.query(
      'SELECT id, username, created_at FROM profiles WHERE google_id = $1',
      [googleId]
    );

    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT id, username, created_at FROM profiles WHERE LOWER(email) = $1',
        [email.toLowerCase()]
      );
    }

    let profile;
    if (result.rows.length > 0) {
      profile = result.rows[0];
      // Link Google account if not already
      await pool.query(
        'UPDATE profiles SET google_id = $1, email = $2 WHERE id = $3',
        [googleId, email, profile.id]
      );
    } else {
      // Create new profile
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `user_${googleId.slice(-8)}`;
      const finalUsername = await uniqueUsername(username);
      const insertResult = await pool.query(
        'INSERT INTO profiles (username, password, password_hash, google_id, email) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, created_at',
        [finalUsername, '', null, googleId, email]
      );
      profile = insertResult.rows[0];
      await pool.query(
        'INSERT INTO app_settings (profile_id, total_days, start_date) VALUES ($1, 84, CURRENT_DATE)',
        [profile.id]
      );
    }

    res.json(profile);
  } catch (error) {
    console.error('Google auth error:', error);
    if (error.message?.includes('Token used too late')) {
      return res.status(401).json({ error: 'Session expired. Please try again.' });
    }
    res.status(401).json({
      error: 'Google sign-in failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

async function uniqueUsername(base) {
  let name = base;
  let n = 0;
  while (true) {
    const r = await pool.query('SELECT 1 FROM profiles WHERE username = $1', [name]);
    if (r.rows.length === 0) return name;
    n += 1;
    name = `${base}${n}`;
  }
}

export default router;
