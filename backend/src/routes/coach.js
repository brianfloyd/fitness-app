import express from 'express';
import pool from '../db/connection.js';
import { requireProfileId } from '../middleware/requireProfileId.js';

const router = express.Router();

// All routes require profile ID
router.use(requireProfileId);

// Environment variables for LLM configuration (OpenAI-compatible, works with xAI Grok)
const COACH_API_KEY = process.env.COACH_API_KEY;
const COACH_BASE_URL = process.env.COACH_BASE_URL || 'https://api.openai.com/v1';
const COACH_MODEL = process.env.COACH_MODEL || 'gpt-4o';

// Exercise substitution suggestions for shoulder/elbow issues
const EXERCISE_SUBSTITUTIONS = {
  // Shoulder-aggravating exercises -> alternatives
  'bench': ['neutral-grip DB press', 'cable press', 'floor press'],
  'barbell bench': ['neutral-grip DB press', 'cable press', 'floor press'],
  'barbell flat': ['neutral-grip DB press', 'cable press', 'floor press'],
  'barbell incline': ['neutral-grip incline DB press', 'low-incline cable press'],
  'chest fly': ['limited-range cable crossover', 'pec deck (partial ROM)', 'svend press'],
  'dumbbell fly': ['limited-range cable crossover', 'pec deck (partial ROM)', 'svend press'],
  'lateral raise': ['light cable lateral raise', 'leaning lateral raise', 'Y-raise'],
  'lateral fly': ['light cable lateral raise', 'leaning lateral raise', 'Y-raise'],
  'shoulder press': ['landmine press', 'high incline DB press', 'cable shoulder press'],
  'overhead press': ['landmine press', 'high incline DB press', 'cable shoulder press'],
  
  // Elbow-aggravating exercises -> alternatives
  'skull crusher': ['rope pushdown', 'overhead rope extension', 'diamond push-up'],
  'tricep extension': ['rope pushdown', 'cable kickback', 'close-grip push-up'],
  'straight bar curl': ['hammer curl', 'rope curl', 'EZ bar curl'],
  'barbell curl': ['hammer curl', 'rope curl', 'EZ bar curl'],
  'preacher curl': ['incline DB curl', 'spider curl (lighter)', 'cable curl'],
};

// Find substitutions for an exercise name
function findSubstitutions(exerciseName) {
  const lowerName = exerciseName.toLowerCase();
  for (const [key, subs] of Object.entries(EXERCISE_SUBSTITUTIONS)) {
    if (lowerName.includes(key)) {
      return subs;
    }
  }
  return null;
}

// Check if coach is available
router.get('/status', (req, res) => {
  const configured = !!COACH_API_KEY;
  res.json({
    available: configured,
    model: configured ? COACH_MODEL : null,
    message: configured ? 'AI Coach is ready' : 'AI Coach not configured. Set COACH_API_KEY environment variable.',
  });
});

// Get exercise substitutions for pain management
router.get('/substitutions', async (req, res) => {
  const { exercise } = req.query;
  if (!exercise) {
    return res.json({ substitutions: EXERCISE_SUBSTITUTIONS });
  }
  
  const subs = findSubstitutions(exercise);
  res.json({
    exercise,
    substitutions: subs || [],
    message: subs ? `Found ${subs.length} alternatives for "${exercise}"` : `No specific alternatives found for "${exercise}"`,
  });
});

// Get weekly summary
router.get('/weekly-summary', async (req, res) => {
  try {
    const profileId = req.profileId;
    
    // Get last 7 days of logs
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const logsResult = await pool.query(
      `SELECT date, weight, fat_percent, waist, workout, protein, fat, carbs, foods, steps, skate_training
       FROM daily_logs 
       WHERE profile_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC`,
      [profileId, weekAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]]
    );
    
    // Get settings for targets
    const settingsResult = await pool.query(
      'SELECT * FROM app_settings WHERE profile_id = $1 ORDER BY id DESC LIMIT 1',
      [profileId]
    );
    const settings = settingsResult.rows[0] || {};
    
    // Calculate weekly metrics
    const logs = logsResult.rows;
    const weights = logs.filter(l => l.weight).map(l => parseFloat(l.weight));
    const waists = logs.filter(l => l.waist).map(l => parseFloat(l.waist));
    const proteins = logs.filter(l => l.protein).map(l => parseFloat(l.protein));
    const calories = logs.map(l => {
      const p = parseFloat(l.protein) || 0;
      const f = parseFloat(l.fat) || 0;
      const c = parseFloat(l.carbs) || 0;
      return (p * 4) + (f * 9) + (c * 4);
    }).filter(c => c > 0);
    
    // Parse workouts for pain data and volume
    let totalVolume = 0;
    const painReports = [];
    const exercisesWithPain = new Set();
    
    for (const log of logs) {
      if (log.workout) {
        try {
          const exercises = JSON.parse(log.workout);
          if (Array.isArray(exercises)) {
            for (const ex of exercises) {
              // Calculate volume
              if (ex.completed && ex.sets) {
                for (const set of ex.sets) {
                  totalVolume += (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0);
                }
              }
              // Track pain
              if (ex.pain_level && ex.pain_level > 0) {
                painReports.push({
                  date: log.date,
                  exercise: ex.name,
                  pain_level: ex.pain_level,
                  pain_location: ex.pain_location,
                  pain_note: ex.pain_note,
                });
                exercisesWithPain.add(ex.name);
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    // Parse skate training for totals
    let totalSkateMiles = 0;
    let totalSkateMinutes = 0;
    let totalSwitchMinutes = 0;
    const skateSessions = [];
    
    for (const log of logs) {
      if (log.skate_training) {
        try {
          const sessions = JSON.parse(log.skate_training);
          if (Array.isArray(sessions)) {
            for (const session of sessions) {
              totalSkateMiles += parseFloat(session.distance_miles) || 0;
              totalSkateMinutes += parseInt(session.duration_minutes) || 0;
              totalSwitchMinutes += parseInt(session.switch_foot_minutes) || 0;
              skateSessions.push({ date: log.date, ...session });
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    // Calculate averages
    const avgWeight = weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : null;
    const avgProtein = proteins.length ? Math.round(proteins.reduce((a, b) => a + b, 0) / proteins.length) : null;
    const avgCalories = calories.length ? Math.round(calories.reduce((a, b) => a + b, 0) / calories.length) : null;
    
    // Weight trend (first vs last)
    const weightTrend = weights.length >= 2 ? (weights[weights.length - 1] - weights[0]).toFixed(1) : null;
    
    // Ultraskate countdown
    let ultraskateCountdown = null;
    if (settings.ultraskate_date) {
      const eventDate = new Date(settings.ultraskate_date);
      const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      ultraskateCountdown = daysUntil > 0 ? daysUntil : 0;
    }
    
    res.json({
      period: {
        start: weekAgo.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
        days_logged: logs.length,
      },
      body: {
        weight_avg: avgWeight ? parseFloat(avgWeight) : null,
        weight_trend: weightTrend ? parseFloat(weightTrend) : null,
        waist_latest: waists.length ? waists[waists.length - 1] : null,
        measurements_count: weights.length,
      },
      nutrition: {
        protein_avg: avgProtein,
        calories_avg: avgCalories,
        protein_target: { min: settings.protein_target_min || 160, max: settings.protein_target_max || 175 },
        calorie_target: { min: settings.calorie_target_min || 2100, max: settings.calorie_target_max || 2200 },
        days_on_target: calories.filter(c => c >= (settings.calorie_target_min || 2100) && c <= (settings.calorie_target_max || 2200)).length,
      },
      training: {
        total_volume_lbs: Math.round(totalVolume),
        workouts_count: logs.filter(l => l.workout).length,
        pain_reports: painReports,
        exercises_with_pain: Array.from(exercisesWithPain).map(ex => ({
          exercise: ex,
          substitutions: findSubstitutions(ex) || [],
        })),
      },
      skating: {
        total_miles: totalSkateMiles.toFixed(1),
        total_minutes: totalSkateMinutes,
        switch_minutes: totalSwitchMinutes,
        sessions_count: skateSessions.length,
        ultraskate_countdown_days: ultraskateCountdown,
      },
    });
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    res.status(500).json({ error: 'Failed to generate weekly summary' });
  }
});

// Chat with AI coach
router.post('/chat', async (req, res) => {
  try {
    if (!COACH_API_KEY) {
      return res.status(503).json({
        error: 'AI Coach not configured',
        message: 'Set COACH_API_KEY, COACH_BASE_URL, and COACH_MODEL environment variables to enable the AI coach.',
      });
    }
    
    const profileId = req.profileId;
    const { message, context_days = 14 } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get recent logs for context
    const today = new Date();
    const contextStart = new Date(today);
    contextStart.setDate(contextStart.getDate() - context_days);
    
    const logsResult = await pool.query(
      `SELECT date, weight, fat_percent, waist, workout, protein, fat, carbs, steps, skate_training
       FROM daily_logs 
       WHERE profile_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date DESC
       LIMIT 14`,
      [profileId, contextStart.toISOString().split('T')[0], today.toISOString().split('T')[0]]
    );
    
    // Get settings
    const settingsResult = await pool.query(
      'SELECT * FROM app_settings WHERE profile_id = $1 ORDER BY id DESC LIMIT 1',
      [profileId]
    );
    const settings = settingsResult.rows[0] || {};
    
    // Build context for the AI
    const logsContext = logsResult.rows.map(log => {
      const cals = ((parseFloat(log.protein) || 0) * 4) + ((parseFloat(log.fat) || 0) * 9) + ((parseFloat(log.carbs) || 0) * 4);
      let workoutSummary = '';
      let painSummary = '';
      
      if (log.workout) {
        try {
          const exercises = JSON.parse(log.workout);
          if (Array.isArray(exercises)) {
            const completed = exercises.filter(e => e.completed);
            workoutSummary = completed.map(e => {
              const volume = e.sets?.reduce((v, s) => v + (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0), 0) || 0;
              return `${e.name} (${volume} lbs)`;
            }).join(', ') || 'Rest day';
            
            const withPain = exercises.filter(e => e.pain_level > 0);
            if (withPain.length) {
              painSummary = withPain.map(e => `${e.name}: pain ${e.pain_level}/10 (${e.pain_location || 'unspecified'})`).join('; ');
            }
          }
        } catch (e) {}
      }
      
      let skateSummary = '';
      if (log.skate_training) {
        try {
          const sessions = JSON.parse(log.skate_training);
          if (Array.isArray(sessions) && sessions.length) {
            skateSummary = sessions.map(s => `${s.session_type}: ${s.distance_miles || 0}mi, ${s.duration_minutes || 0}min`).join('; ');
          }
        } catch (e) {}
      }
      
      return {
        date: log.date,
        weight: log.weight,
        waist: log.waist,
        calories: Math.round(cals) || null,
        protein: log.protein,
        workout: workoutSummary || null,
        pain: painSummary || null,
        skating: skateSummary || null,
        steps: log.steps,
      };
    });
    
    // Determine program phase
    let phase = 'unknown';
    let blockNumber = null;
    if (settings.ramp_start_date && settings.program_start_date) {
      const rampStart = new Date(settings.ramp_start_date);
      const programStart = new Date(settings.program_start_date);
      
      if (today < rampStart) {
        phase = 'pre-ramp';
      } else if (today < programStart) {
        phase = 'ramp-week (50-60% effort)';
      } else {
        phase = 'full-program';
        const daysSinceStart = Math.floor((today - programStart) / (1000 * 60 * 60 * 24));
        const blockWeeks = settings.block_duration_weeks || 4;
        blockNumber = Math.floor(daysSinceStart / (blockWeeks * 7)) + 1;
      }
    }
    
    // Calculate Ultraskate countdown
    let ultraskateInfo = '';
    if (settings.ultraskate_date) {
      const eventDate = new Date(settings.ultraskate_date);
      const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0) {
        ultraskateInfo = `Ultraskate event in ${daysUntil} days (${settings.ultraskate_date}).`;
      }
    }
    
    const systemPrompt = `You are Brian's AI fitness coach. You have access to his training data and help with:
1. Workout advice - double progression (increase reps each session, then weight when hitting top of rep range)
2. Pain management - he has left shoulder and elbow issues; suggest alternatives when pain is logged
3. Nutrition guidance - targets are ${settings.calorie_target_min || 2100}-${settings.calorie_target_max || 2200} kcal and ${settings.protein_target_min || 160}-${settings.protein_target_max || 175}g protein on weekdays
4. Weekly check-ins - weight trend, waist, volume progress
5. Skateboard training for Ultraskate endurance event - LDP, scogging technique, switch-foot practice

Current program phase: ${phase}${blockNumber ? ` (Block ${blockNumber})` : ''}
${ultraskateInfo}

Training split: Mon=back/biceps, Tue=chest/triceps, Wed=shoulders, Thu=legs, Fri=upper mashup
Gym: Planet Fitness (dumbbells, Smith machine, cables, machines, fixed barbells ≤60 lb)
Demographics: 54-year-old male, 5'10", cutting to visible abs while preserving muscle

Recent training data (most recent first):
${JSON.stringify(logsContext, null, 2)}

Exercise substitutions for pain:
${JSON.stringify(EXERCISE_SUBSTITUTIONS, null, 2)}

Be concise, actionable, and encouraging. Reference specific data when relevant.`;
    
    // Call the AI API
    const response = await fetch(`${COACH_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COACH_API_KEY}`,
      },
      body: JSON.stringify({
        model: COACH_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('AI API error:', response.status, errorData);
      return res.status(502).json({
        error: 'AI service error',
        message: errorData.error?.message || `API returned ${response.status}`,
      });
    }
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from AI';
    
    res.json({
      reply,
      model: COACH_MODEL,
      context: {
        phase,
        block_number: blockNumber,
        logs_analyzed: logsContext.length,
      },
    });
  } catch (error) {
    console.error('Error in coach chat:', error);
    res.status(500).json({
      error: 'Failed to process chat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
