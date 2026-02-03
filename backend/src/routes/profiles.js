import express from 'express';
import pool from '../db/connection.js';

const router = express.Router();

// List all profiles (username only, no password)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, created_at FROM profiles ORDER BY username'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      error: 'Failed to fetch profiles',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Add new profile
router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const trimmed = (username || '').trim().toLowerCase();
    if (!trimmed) {
      return res.status(400).json({ error: 'Username cannot be empty' });
    }

    const result = await pool.query(
      'INSERT INTO profiles (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
      [trimmed, String(password)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Error creating profile:', error);
    res.status(500).json({
      error: 'Failed to create profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Verify password for a profile (returns profile if correct)
router.post('/verify', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || password === undefined) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const trimmed = (username || '').trim().toLowerCase();

    const result = await pool.query(
      'SELECT id, username, created_at FROM profiles WHERE LOWER(username) = $1 AND password = $2',
      [trimmed, String(password)]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error verifying profile:', error);
    res.status(500).json({
      error: 'Failed to verify profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
