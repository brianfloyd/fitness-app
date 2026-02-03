import express from 'express';
import multer from 'multer';
import pool from '../db/connection.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Get current app settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM app_settings ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        total_days: 84,
        start_date: new Date().toISOString().split('T')[0],
      });
    }
    
    const settings = result.rows[0];
    res.json({
      id: settings.id,
      total_days: settings.total_days,
      start_date: settings.start_date,
      has_goal_photo: !!settings.goal_photo,
      goal_photo_mime_type: settings.goal_photo_mime_type || null,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch settings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update settings
router.put('/', upload.single('goal_photo'), async (req, res) => {
  try {
    // Parse form data fields (total_days and start_date come from FormData)
    const total_days = req.body.total_days ? parseInt(req.body.total_days) : null;
    const start_date = req.body.start_date;
    
    console.log('Settings update request:', {
      total_days,
      start_date,
      hasPhoto: !!req.file,
      photoSize: req.file?.size
    });
    
    if (!total_days || !start_date) {
      return res.status(400).json({ error: 'total_days and start_date are required' });
    }
    
    // Check if settings exist
    const existing = await pool.query(
      'SELECT * FROM app_settings ORDER BY id DESC LIMIT 1'
    );
    
    let result;
    const photo = req.file ? req.file.buffer : null;
    const photoMimeType = req.file ? req.file.mimetype : null;
    
    if (existing.rows.length === 0) {
      // Insert new settings
      if (photo) {
        result = await pool.query(
          'INSERT INTO app_settings (total_days, start_date, goal_photo, goal_photo_mime_type) VALUES ($1, $2, $3, $4) RETURNING id, total_days, start_date, goal_photo_mime_type',
          [total_days, start_date, photo, photoMimeType]
        );
      } else {
        result = await pool.query(
          'INSERT INTO app_settings (total_days, start_date) VALUES ($1, $2) RETURNING id, total_days, start_date, goal_photo_mime_type',
          [total_days, start_date]
        );
      }
    } else {
      // Update existing settings
      if (photo) {
        result = await pool.query(
          'UPDATE app_settings SET total_days = $1, start_date = $2, goal_photo = $3, goal_photo_mime_type = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, total_days, start_date, goal_photo_mime_type',
          [total_days, start_date, photo, photoMimeType, existing.rows[0].id]
        );
      } else {
        // Only update if goal_photo is not being cleared (if photo not provided, don't update photo fields)
        result = await pool.query(
          'UPDATE app_settings SET total_days = $1, start_date = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, total_days, start_date, goal_photo_mime_type',
          [total_days, start_date, existing.rows[0].id]
        );
      }
    }
    
    res.json({
      id: result.rows[0].id,
      total_days: result.rows[0].total_days,
      start_date: result.rows[0].start_date,
      has_goal_photo: !!result.rows[0].goal_photo_mime_type,
      goal_photo_mime_type: result.rows[0].goal_photo_mime_type || null,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    
    // Check if it's a database column error
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      return res.status(500).json({ 
        error: 'Database schema is missing goal_photo columns. Please run the migration script.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update settings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current day number calculation
router.get('/current-day', async (req, res) => {
  try {
    const settingsResult = await pool.query(
      'SELECT * FROM app_settings ORDER BY id DESC LIMIT 1'
    );
    
    if (settingsResult.rows.length === 0) {
      return res.json({
        day_number: 1,
        total_days: 84,
        start_date: new Date().toISOString().split('T')[0],
      });
    }
    
    const settings = settingsResult.rows[0];
    const startDate = new Date(settings.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const dayNumber = diffDays + 1;
    
    // Ensure day number is within valid range
    const validDayNumber = Math.max(1, Math.min(dayNumber, settings.total_days));
    
    res.json({
      day_number: validDayNumber,
      total_days: settings.total_days,
      start_date: settings.start_date,
    });
  } catch (error) {
    console.error('Error calculating current day:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to calculate current day',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get goal photo
router.get('/goal-photo', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT goal_photo, goal_photo_mime_type FROM app_settings ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length === 0 || !result.rows[0].goal_photo) {
      return res.status(404).json({ error: 'Goal photo not found' });
    }
    
    const { goal_photo, goal_photo_mime_type } = result.rows[0];
    res.set('Content-Type', goal_photo_mime_type);
    res.send(goal_photo);
  } catch (error) {
    console.error('Error fetching goal photo:', error);
    res.status(500).json({ error: 'Failed to fetch goal photo' });
  }
});

// Delete goal photo
router.delete('/goal-photo', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE app_settings SET goal_photo = NULL, goal_photo_mime_type = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM app_settings ORDER BY id DESC LIMIT 1) RETURNING id'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal photo:', error);
    res.status(500).json({ error: 'Failed to delete goal photo' });
  }
});

export default router;
