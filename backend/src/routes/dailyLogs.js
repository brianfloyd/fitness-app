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

// Helper: calculate day number for a profile and date
async function calculateDayNumber(profileId, date) {
  const settingsResult = await pool.query(
    'SELECT * FROM app_settings WHERE profile_id = $1 ORDER BY id DESC LIMIT 1',
    [profileId]
  );
  if (settingsResult.rows.length === 0) return 1;
  const settings = settingsResult.rows[0];
  const startDate = new Date(settings.start_date);
  const logDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  logDate.setHours(0, 0, 0, 0);
  const diffTime = logDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const dayNumber = diffDays + 1;
  return Math.max(1, Math.min(dayNumber, settings.total_days));
}

// Get all logs (paginated, scoped to profile)
router.get('/', async (req, res) => {
  try {
    const profileId = req.profileId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      'SELECT id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps, created_at, updated_at FROM daily_logs WHERE profile_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3',
      [profileId, limit, offset]
    );
    
    const countResult = await pool.query('SELECT COUNT(*) FROM daily_logs WHERE profile_id = $1', [profileId]);
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch logs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get logs by date range (scoped to profile)
router.get('/range', async (req, res) => {
  try {
    const profileId = req.profileId;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }
    const result = await pool.query(
      'SELECT id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps, created_at, updated_at FROM daily_logs WHERE profile_id = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC',
      [profileId, startDate, endDate]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logs by date range:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch logs by date range',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get log for specific date (scoped to profile)
router.get('/:date', async (req, res) => {
  try {
    const profileId = req.profileId;
    const { date } = req.params;
    const result = await pool.query(
      'SELECT id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps, created_at, updated_at FROM daily_logs WHERE profile_id = $1 AND date = $2',
      [profileId, date]
    );
    
    if (result.rows.length === 0) {
      const dayNumber = await calculateDayNumber(profileId, date);
      const settingsResult = await pool.query(
        'SELECT total_days FROM app_settings WHERE profile_id = $1 ORDER BY id DESC LIMIT 1',
        [profileId]
      );
      const totalDays = settingsResult.rows[0]?.total_days || 84;
      
      return res.json({
        date,
        day_number: dayNumber,
        total_days: totalDays,
        photo_mime_type: null,
        weight: null,
        fat_percent: null,
        workout: null,
        protein: null,
        fat: null,
        carbs: null,
        sleep_time: null,
        sleep_score: null,
        strava: null,
        steps: null,
      });
    }
    
    const log = result.rows[0];
    const settingsResult = await pool.query(
      'SELECT total_days FROM app_settings WHERE profile_id = $1 ORDER BY id DESC LIMIT 1',
      [profileId]
    );
    const totalDays = settingsResult.rows[0]?.total_days || 84;
    res.json({ ...log, total_days: totalDays });
  } catch (error) {
    console.error('Error fetching log:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch log',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get today's log (scoped to profile)
router.get('/today', async (req, res) => {
  try {
    const profileId = req.profileId;
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      'SELECT id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps, created_at, updated_at FROM daily_logs WHERE profile_id = $1 AND date = $2',
      [profileId, today]
    );
    const dayNumber = await calculateDayNumber(profileId, today);
    const settingsResult = await pool.query(
      'SELECT total_days FROM app_settings WHERE profile_id = $1 ORDER BY id DESC LIMIT 1',
      [profileId]
    );
    const totalDays = settingsResult.rows[0]?.total_days || 84;
    
    if (result.rows.length === 0) {
      return res.json({
        date: today,
        day_number: dayNumber,
        total_days: totalDays,
        photo_mime_type: null,
        weight: null,
        fat_percent: null,
        workout: null,
        protein: null,
        fat: null,
        carbs: null,
        sleep_time: null,
        sleep_score: null,
        strava: null,
        steps: null,
      });
    }
    
    res.json({
      ...result.rows[0],
      total_days: totalDays,
    });
  } catch (error) {
    console.error('Error fetching today\'s log:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s log' });
  }
});

// Create or update log entry (scoped to profile)
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const profileId = req.profileId;
    const {
      date,
      weight,
      fat_percent,
      workout,
      protein,
      fat,
      carbs,
      foods,
      sleep_time,
      sleep_score,
      strava,
      steps,
    } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];
    const dayNumber = await calculateDayNumber(profileId, logDate);
    const existing = await pool.query(
      'SELECT id FROM daily_logs WHERE profile_id = $1 AND date = $2',
      [profileId, logDate]
    );
    
    let photo = null;
    let photoMimeType = null;
    
    if (req.file) {
      photo = req.file.buffer;
      photoMimeType = req.file.mimetype;
    }
    
    let result;
    if (existing.rows.length > 0) {
      if (photo) {
        result = await pool.query(
          `UPDATE daily_logs 
           SET day_number = $1, photo = $2, photo_mime_type = $3, weight = $4, fat_percent = $5, 
               workout = $6, protein = $7, fat = $8, carbs = $9, foods = $10, sleep_time = $11, 
               sleep_score = $12, strava = $13, steps = $14, updated_at = CURRENT_TIMESTAMP
           WHERE profile_id = $15 AND date = $16
           RETURNING id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps`,
          [dayNumber, photo, photoMimeType, weight || null, fat_percent || null, workout || null,
           protein || null, fat || null, carbs || null, foods || null, sleep_time || null, sleep_score || null,
           strava || null, steps || null, profileId, logDate]
        );
      } else {
        result = await pool.query(
          `UPDATE daily_logs 
           SET day_number = $1, weight = $2, fat_percent = $3, workout = $4, protein = $5, 
               fat = $6, carbs = $7, foods = $8, sleep_time = $9, sleep_score = $10, strava = $11, 
               steps = $12, updated_at = CURRENT_TIMESTAMP
           WHERE profile_id = $13 AND date = $14
           RETURNING id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps`,
          [dayNumber, weight || null, fat_percent || null, workout || null, protein || null,
           fat || null, carbs || null, foods || null, sleep_time || null, sleep_score || null, strava || null,
           steps || null, profileId, logDate]
        );
      }
    } else {
      result = await pool.query(
        `INSERT INTO daily_logs (profile_id, date, day_number, photo, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps`,
        [profileId, logDate, dayNumber, photo, photoMimeType, weight || null, fat_percent || null, workout || null,
         protein || null, fat || null, carbs || null, foods || null, sleep_time || null, sleep_score || null,
         strava || null, steps || null]
      );
    }
    const settingsResult = await pool.query(
      'SELECT total_days FROM app_settings WHERE profile_id = $1 ORDER BY id DESC LIMIT 1',
      [profileId]
    );
    const totalDays = settingsResult.rows[0]?.total_days || 84;
    
    res.json({
      ...result.rows[0],
      total_days: totalDays,
    });
  } catch (error) {
    console.error('Error saving log:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save log',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update existing log (scoped to profile)
router.put('/:date', upload.single('photo'), async (req, res) => {
  try {
    const profileId = req.profileId;
    const { date } = req.params;
    const {
      weight,
      fat_percent,
      workout,
      protein,
      fat,
      carbs,
      foods,
      sleep_time,
      sleep_score,
      strava,
      steps,
    } = req.body;
    const dayNumber = await calculateDayNumber(profileId, date);
    const existing = await pool.query(
      'SELECT id FROM daily_logs WHERE profile_id = $1 AND date = $2',
      [profileId, date]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Log not found for this date' });
    }
    
    let result;
    if (req.file) {
      result = await pool.query(
        `UPDATE daily_logs 
         SET day_number = $1, photo = $2, photo_mime_type = $3, weight = $4, fat_percent = $5, 
             workout = $6, protein = $7, fat = $8, carbs = $9, foods = $10, sleep_time = $11, 
             sleep_score = $12, strava = $13, steps = $14, updated_at = CURRENT_TIMESTAMP
         WHERE profile_id = $15 AND date = $16
         RETURNING id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps`,
        [dayNumber, req.file.buffer, req.file.mimetype, weight || null, fat_percent || null, workout || null,
         protein || null, fat || null, carbs || null, foods || null, sleep_time || null, sleep_score || null,
         strava || null, steps || null, profileId, date]
      );
    } else {
      result = await pool.query(
        `UPDATE daily_logs 
         SET day_number = $1, weight = $2, fat_percent = $3, workout = $4, protein = $5, 
             fat = $6, carbs = $7, foods = $8, sleep_time = $9, sleep_score = $10, strava = $11, 
             steps = $12, updated_at = CURRENT_TIMESTAMP
         WHERE profile_id = $13 AND date = $14
         RETURNING id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps`,
        [dayNumber, weight || null, fat_percent || null, workout || null, protein || null,
         fat || null, carbs || null, foods || null, sleep_time || null, sleep_score || null, strava || null,
         steps || null, profileId, date]
      );
    }
    const settingsResult = await pool.query(
      'SELECT total_days FROM app_settings WHERE profile_id = $1 ORDER BY id DESC LIMIT 1',
      [profileId]
    );
    const totalDays = settingsResult.rows[0]?.total_days || 84;
    
    res.json({
      ...result.rows[0],
      total_days: totalDays,
    });
  } catch (error) {
    console.error('Error updating log:', error);
    res.status(500).json({ error: 'Failed to update log' });
  }
});

// Get photo for specific date (scoped to profile)
router.get('/:date/photo', async (req, res) => {
  try {
    const profileId = req.profileId;
    const { date } = req.params;
    const result = await pool.query(
      'SELECT photo, photo_mime_type FROM daily_logs WHERE profile_id = $1 AND date = $2',
      [profileId, date]
    );
    
    if (result.rows.length === 0 || !result.rows[0].photo) {
      return res.status(404).json({ error: 'Photo not found for this date' });
    }
    
    const { photo, photo_mime_type } = result.rows[0];
    res.set('Content-Type', photo_mime_type);
    res.send(photo);
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// Get previously used foods from this profile's logs
router.get('/foods/used', async (req, res) => {
  try {
    const profileId = req.profileId;
    const result = await pool.query(
      'SELECT foods FROM daily_logs WHERE profile_id = $1 AND foods IS NOT NULL AND foods != \'\'',
      [profileId]
    );
    
    const usedFoodsMap = new Map();
    
    result.rows.forEach(row => {
      try {
        const foods = JSON.parse(row.foods);
        if (Array.isArray(foods)) {
          foods.forEach(food => {
            if (!food) return;
            const key = food.customFoodId != null ? `custom-${food.customFoodId}` : (food.fdcId != null ? `fdc-${food.fdcId}` : null);
            if (!key || usedFoodsMap.has(key)) return;
            if (food.customFoodId != null) {
              usedFoodsMap.set(key, {
                customFoodId: food.customFoodId,
                description: food.name || food.description || '',
                brandOwner: food.brand || null,
                dataType: 'Custom',
              });
            } else {
              usedFoodsMap.set(key, {
                fdcId: food.fdcId,
                description: food.name || food.description || food.foodData?.description || '',
                brandOwner: food.brand || food.brandOwner || food.foodData?.brandOwner || null,
                gtinUpc: food.foodData?.gtinUpc || null,
                dataType: food.foodData?.dataType || null,
              });
            }
          });
        }
      } catch (e) {
        console.debug('Error parsing foods JSON:', e);
      }
    });
    
    const usedFoods = Array.from(usedFoodsMap.values());
    res.json({ foods: usedFoods });
  } catch (error) {
    console.error('Error fetching used foods:', error);
    res.status(500).json({ 
      error: 'Failed to fetch used foods',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
