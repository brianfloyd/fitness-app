/**
 * MCP Server for Fitness App
 * 
 * Implements the Model Context Protocol (MCP) with Streamable HTTP transport.
 * Provides tools for AI assistants to log food, workouts, and body metrics.
 * 
 * Protocol: JSON-RPC 2.0 over HTTP (Streamable HTTP transport)
 * Auth: Per-profile Bearer token
 * 
 * Deploy as: Railway HTTP endpoint at /api/mcp
 * Connect as: Remote MCP server with URL + Authorization: Bearer header
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/connection.js';

const router = express.Router();

// MCP Protocol constants
const MCP_VERSION = '2024-11-05';
const SERVER_NAME = 'fitness-tracker-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Token authentication middleware
 * Expects: Authorization: Bearer <token>
 * Validates token against profiles.api_token_hash
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <your-api-token>' },
      id: null,
    });
  }
  
  const token = authHeader.substring(7);
  if (!token) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Empty token' },
      id: null,
    });
  }
  
  try {
    // Find profile with matching token hash
    const result = await pool.query(
      'SELECT id, username, api_token_hash FROM profiles WHERE api_token_hash IS NOT NULL'
    );
    
    for (const profile of result.rows) {
      if (profile.api_token_hash && await bcrypt.compare(token, profile.api_token_hash)) {
        req.profileId = profile.id;
        req.profileUsername = profile.username;
        return next();
      }
    }
    
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid API token' },
      id: null,
    });
  } catch (err) {
    console.error('Token auth error:', err);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Authentication failed' },
      id: null,
    });
  }
}

// Tool definitions for MCP
const TOOLS = [
  {
    name: 'search_food',
    description: 'Search for foods by name or barcode. Returns matching foods from USDA database and custom foods.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Food name to search for' },
        barcode: { type: 'string', description: 'Barcode (GTIN/UPC) to search for' },
      },
    },
  },
  {
    name: 'log_food',
    description: 'Log a food entry for a specific date. Can search and log in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
        food_name: { type: 'string', description: 'Name or description of the food' },
        quantity: { type: 'number', description: 'Amount of food' },
        unit: { type: 'string', description: 'Unit (g, oz, serving, cup, etc.)', default: 'g' },
        meal: { type: 'string', description: 'Meal type (breakfast, lunch, dinner, snack)' },
        calories: { type: 'number', description: 'Override calories (optional)' },
        protein: { type: 'number', description: 'Override protein in grams (optional)' },
        fat: { type: 'number', description: 'Override fat in grams (optional)' },
        carbs: { type: 'number', description: 'Override carbs in grams (optional)' },
      },
      required: ['food_name', 'quantity'],
    },
  },
  {
    name: 'get_daily_nutrition',
    description: 'Get nutrition summary for a specific date',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
      },
    },
  },
  {
    name: 'list_food_entries',
    description: 'List all food entries for a specific date',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
      },
    },
  },
  {
    name: 'update_food_entry',
    description: 'Update a specific food entry',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        entry_index: { type: 'number', description: 'Index of the food entry to update (0-based)' },
        quantity: { type: 'number', description: 'New amount' },
        unit: { type: 'string', description: 'New unit' },
      },
      required: ['date', 'entry_index'],
    },
  },
  {
    name: 'delete_food_entry',
    description: 'Delete a specific food entry',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        entry_index: { type: 'number', description: 'Index of the food entry to delete (0-based)' },
      },
      required: ['date', 'entry_index'],
    },
  },
  {
    name: 'log_weight',
    description: 'Log weight and optional waist measurement',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
        weight: { type: 'number', description: 'Weight in pounds' },
        waist: { type: 'number', description: 'Waist measurement in inches (optional)' },
      },
      required: ['weight'],
    },
  },
  {
    name: 'log_workout',
    description: 'Log a workout with exercises',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
        exercises: {
          type: 'array',
          description: 'Array of exercises',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Exercise name' },
              muscle_group: { type: 'string', description: 'Muscle group (Biceps, Triceps, Chest, Back, Shoulders, Legs, Core, Forearms)' },
              sets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    weight: { type: 'number', description: 'Weight in lbs' },
                    reps: { type: 'number', description: 'Number of reps' },
                  },
                },
              },
            },
          },
        },
      },
      required: ['exercises'],
    },
  },
  {
    name: 'log_skate_session',
    description: 'Log a skateboard training session',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
        session_type: { type: 'string', description: 'Type: ldp, scogging, freestyle, long_session, switch_practice' },
        distance_miles: { type: 'number', description: 'Distance in miles' },
        duration_minutes: { type: 'number', description: 'Duration in minutes' },
        switch_foot_minutes: { type: 'number', description: 'Minutes on switch foot' },
        weak_side_comfort: { type: 'number', description: 'Comfort level 1-10' },
        notes: { type: 'string', description: 'Session notes' },
      },
      required: ['session_type'],
    },
  },
];

// Apply authentication to all MCP routes
router.use(authenticateToken);

/**
 * POST /api/mcp
 * Main MCP endpoint - handles JSON-RPC requests
 * Supports: initialize, tools/list, tools/call
 */
router.post('/', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;
  
  // Validate JSON-RPC format
  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
      id: id || null,
    });
  }
  
  if (!method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: method is required' },
      id: id || null,
    });
  }
  
  try {
    let result;
    
    switch (method) {
      case 'initialize':
        result = handleInitialize(params);
        break;
      case 'tools/list':
        result = handleToolsList();
        break;
      case 'tools/call':
        result = await handleToolsCall(req.profileId, params);
        break;
      case 'notifications/initialized':
        // Client notification - acknowledge but no response needed
        return res.json({ jsonrpc: '2.0', result: {}, id });
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${method}` },
          id,
        });
    }
    
    res.json({ jsonrpc: '2.0', result, id });
  } catch (err) {
    console.error(`MCP error (${method}):`, err);
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: err.message || 'Internal error' },
      id,
    });
  }
});

/**
 * Handle initialize request
 */
function handleInitialize(params) {
  return {
    protocolVersion: MCP_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  };
}

/**
 * Handle tools/list request
 */
function handleToolsList() {
  return { tools: TOOLS };
}

/**
 * Handle tools/call request
 */
async function handleToolsCall(profileId, params) {
  const { name, arguments: args } = params || {};
  
  if (!name) {
    throw new Error('Tool name is required');
  }
  
  let result;
  
  switch (name) {
    case 'search_food':
      result = await searchFood(profileId, args);
      break;
    case 'log_food':
      result = await logFood(profileId, args);
      break;
    case 'get_daily_nutrition':
      result = await getDailyNutrition(profileId, args);
      break;
    case 'list_food_entries':
      result = await listFoodEntries(profileId, args);
      break;
    case 'update_food_entry':
      result = await updateFoodEntry(profileId, args);
      break;
    case 'delete_food_entry':
      result = await deleteFoodEntry(profileId, args);
      break;
    case 'log_weight':
      result = await logWeight(profileId, args);
      break;
    case 'log_workout':
      result = await logWorkout(profileId, args);
      break;
    case 'log_skate_session':
      result = await logSkateSession(profileId, args);
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// Helper: get today's date in YYYY-MM-DD format (server timezone)
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Helper: get or create log for date
async function getOrCreateLog(profileId, date) {
  let result = await pool.query(
    'SELECT id, foods, workout, skate_training, weight, waist FROM daily_logs WHERE profile_id = $1 AND date = $2',
    [profileId, date]
  );
  
  if (result.rows.length === 0) {
    // Create empty log
    result = await pool.query(
      `INSERT INTO daily_logs (profile_id, date, day_number) VALUES ($1, $2, 1)
       RETURNING id, foods, workout, skate_training, weight, waist`,
      [profileId, date]
    );
  }
  
  return result.rows[0];
}

// Tool: search_food
async function searchFood(profileId, params) {
  const { query, barcode } = params || {};
  
  if (!query && !barcode) {
    throw new Error('Either query or barcode is required');
  }
  
  const searchTerm = query || barcode;
  const isBarcode = !!barcode;
  
  // Search custom foods first
  const customResult = await pool.query(
    `SELECT id, name, brand, barcode, serving_size, serving_unit, calories, protein, fat, carbs
     FROM foods WHERE source = 'custom' AND (profile_id = $1 OR profile_id IS NULL)
     AND (LOWER(name) LIKE $2 OR (barcode IS NOT NULL AND barcode = $3))
     ORDER BY profile_id NULLS LAST, name LIMIT 10`,
    [profileId, `%${searchTerm.toLowerCase()}%`, searchTerm]
  );
  
  const customFoods = customResult.rows.map(r => ({
    source: 'custom',
    id: r.id,
    name: r.name,
    brand: r.brand,
    barcode: r.barcode,
    serving_size: parseFloat(r.serving_size),
    serving_unit: r.serving_unit,
    per_serving: {
      calories: parseFloat(r.calories),
      protein: r.protein ? parseFloat(r.protein) : null,
      fat: r.fat ? parseFloat(r.fat) : null,
      carbs: r.carbs ? parseFloat(r.carbs) : null,
    },
  }));
  
  // If we have USDA API key, also search USDA
  let usdaFoods = [];
  if (process.env.USDA_API_KEY) {
    try {
      const searchBody = {
        query: searchTerm,
        pageSize: 10,
      };
      
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchBody),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        usdaFoods = (data.foods || []).slice(0, 10).map(f => {
          let calories = 0, protein = null, fat = null, carbs = null;
          (f.foodNutrients || []).forEach(n => {
            const id = n.nutrientId;
            const v = n.value;
            if (id === 1008) calories = v;
            else if (id === 1003) protein = v;
            else if (id === 1004) fat = v;
            else if (id === 1005) carbs = v;
          });
          
          return {
            source: 'usda',
            fdc_id: f.fdcId,
            name: f.description,
            brand: f.brandOwner || null,
            barcode: f.gtinUpc || null,
            serving_size: f.servingSize || 100,
            serving_unit: f.servingSizeUnit || 'g',
            per_serving: { calories, protein, fat, carbs },
          };
        });
      }
    } catch (err) {
      console.warn('USDA search failed:', err.message);
    }
  }
  
  return {
    foods: [...customFoods, ...usdaFoods],
    total: customFoods.length + usdaFoods.length,
  };
}

// Tool: log_food
async function logFood(profileId, params) {
  const { date, food_name, quantity, unit = 'g', meal, calories, protein, fat, carbs } = params || {};
  
  if (!food_name) {
    throw new Error('food_name is required');
  }
  if (!quantity || quantity <= 0) {
    throw new Error('quantity must be a positive number');
  }
  
  const logDate = date || getToday();
  
  // Search for the food
  const searchResult = await searchFood(profileId, { query: food_name });
  const matchingFood = searchResult.foods[0];
  
  let foodEntry;
  
  if (matchingFood) {
    // Calculate macros based on serving
    const servingSize = matchingFood.serving_size || 100;
    const servingUnit = matchingFood.serving_unit || 'g';
    const factor = calculateFactor(quantity, unit, servingSize, servingUnit);
    
    foodEntry = {
      id: `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: matchingFood.name,
      brand: matchingFood.brand,
      amount: quantity,
      unit: unit,
      meal: meal || null,
      source: matchingFood.source,
      fdcId: matchingFood.fdc_id || null,
      customFoodId: matchingFood.id || null,
      calories: calories ?? Math.round((matchingFood.per_serving.calories || 0) * factor),
      protein: protein ?? Math.round(((matchingFood.per_serving.protein || 0) * factor) * 10) / 10,
      fat: fat ?? Math.round(((matchingFood.per_serving.fat || 0) * factor) * 10) / 10,
      carbs: carbs ?? Math.round(((matchingFood.per_serving.carbs || 0) * factor) * 10) / 10,
    };
  } else {
    // Create a quick-add entry with provided or estimated macros
    foodEntry = {
      id: `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: food_name,
      amount: quantity,
      unit: unit,
      meal: meal || null,
      source: 'mcp_quick_add',
      calories: calories ?? 0,
      protein: protein ?? 0,
      fat: fat ?? 0,
      carbs: carbs ?? 0,
    };
  }
  
  // Get existing log and append food
  const log = await getOrCreateLog(profileId, logDate);
  let foods = [];
  
  if (log.foods) {
    try {
      foods = JSON.parse(log.foods);
      if (!Array.isArray(foods)) foods = [];
    } catch (e) {
      foods = [];
    }
  }
  
  foods.push(foodEntry);
  
  // Update the log
  await pool.query(
    'UPDATE daily_logs SET foods = $1, updated_at = CURRENT_TIMESTAMP WHERE profile_id = $2 AND date = $3',
    [JSON.stringify(foods), profileId, logDate]
  );
  
  return {
    logged: foodEntry,
    date: logDate,
    total_entries: foods.length,
  };
}

// Tool: get_daily_nutrition
async function getDailyNutrition(profileId, params) {
  const { date } = params || {};
  const logDate = date || getToday();
  
  const result = await pool.query(
    'SELECT foods, protein, fat, carbs FROM daily_logs WHERE profile_id = $1 AND date = $2',
    [profileId, logDate]
  );
  
  if (result.rows.length === 0) {
    return { date: logDate, entries: 0, totals: { calories: 0, protein: 0, fat: 0, carbs: 0 } };
  }
  
  const log = result.rows[0];
  let foods = [];
  
  if (log.foods) {
    try {
      foods = JSON.parse(log.foods);
      if (!Array.isArray(foods)) foods = [];
    } catch (e) {
      foods = [];
    }
  }
  
  const totals = foods.reduce((acc, f) => ({
    calories: acc.calories + (f.calories || 0),
    protein: acc.protein + (f.protein || 0),
    fat: acc.fat + (f.fat || 0),
    carbs: acc.carbs + (f.carbs || 0),
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
  
  return {
    date: logDate,
    entries: foods.length,
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
    },
  };
}

// Tool: list_food_entries
async function listFoodEntries(profileId, params) {
  const { date } = params || {};
  const logDate = date || getToday();
  
  const result = await pool.query(
    'SELECT foods FROM daily_logs WHERE profile_id = $1 AND date = $2',
    [profileId, logDate]
  );
  
  if (result.rows.length === 0) {
    return { date: logDate, entries: [] };
  }
  
  let foods = [];
  if (result.rows[0].foods) {
    try {
      foods = JSON.parse(result.rows[0].foods);
      if (!Array.isArray(foods)) foods = [];
    } catch (e) {
      foods = [];
    }
  }
  
  return {
    date: logDate,
    entries: foods.map((f, i) => ({
      index: i,
      name: f.name,
      amount: f.amount,
      unit: f.unit,
      meal: f.meal || null,
      calories: f.calories || 0,
      protein: f.protein || 0,
      fat: f.fat || 0,
      carbs: f.carbs || 0,
    })),
  };
}

// Tool: update_food_entry
async function updateFoodEntry(profileId, params) {
  const { date, entry_index, quantity, unit } = params || {};
  
  if (!date) throw new Error('date is required');
  if (entry_index === undefined || entry_index < 0) throw new Error('valid entry_index is required');
  
  const result = await pool.query(
    'SELECT foods FROM daily_logs WHERE profile_id = $1 AND date = $2',
    [profileId, date]
  );
  
  if (result.rows.length === 0) {
    throw new Error('No log found for this date');
  }
  
  let foods = [];
  if (result.rows[0].foods) {
    try {
      foods = JSON.parse(result.rows[0].foods);
      if (!Array.isArray(foods)) foods = [];
    } catch (e) {
      foods = [];
    }
  }
  
  if (entry_index >= foods.length) {
    throw new Error(`Entry index ${entry_index} out of range (${foods.length} entries)`);
  }
  
  const entry = foods[entry_index];
  
  if (quantity !== undefined) entry.amount = quantity;
  if (unit !== undefined) entry.unit = unit;
  
  await pool.query(
    'UPDATE daily_logs SET foods = $1, updated_at = CURRENT_TIMESTAMP WHERE profile_id = $2 AND date = $3',
    [JSON.stringify(foods), profileId, date]
  );
  
  return { updated: entry, date, index: entry_index };
}

// Tool: delete_food_entry
async function deleteFoodEntry(profileId, params) {
  const { date, entry_index } = params || {};
  
  if (!date) throw new Error('date is required');
  if (entry_index === undefined || entry_index < 0) throw new Error('valid entry_index is required');
  
  const result = await pool.query(
    'SELECT foods FROM daily_logs WHERE profile_id = $1 AND date = $2',
    [profileId, date]
  );
  
  if (result.rows.length === 0) {
    throw new Error('No log found for this date');
  }
  
  let foods = [];
  if (result.rows[0].foods) {
    try {
      foods = JSON.parse(result.rows[0].foods);
      if (!Array.isArray(foods)) foods = [];
    } catch (e) {
      foods = [];
    }
  }
  
  if (entry_index >= foods.length) {
    throw new Error(`Entry index ${entry_index} out of range (${foods.length} entries)`);
  }
  
  const deleted = foods.splice(entry_index, 1)[0];
  
  await pool.query(
    'UPDATE daily_logs SET foods = $1, updated_at = CURRENT_TIMESTAMP WHERE profile_id = $2 AND date = $3',
    [JSON.stringify(foods), profileId, date]
  );
  
  return { deleted, date, remaining_entries: foods.length };
}

// Tool: log_weight
async function logWeight(profileId, params) {
  const { date, weight, waist } = params || {};
  
  if (!weight || weight <= 0) {
    throw new Error('weight must be a positive number');
  }
  
  const logDate = date || getToday();
  
  await getOrCreateLog(profileId, logDate);
  
  if (waist !== undefined) {
    await pool.query(
      'UPDATE daily_logs SET weight = $1, waist = $2, updated_at = CURRENT_TIMESTAMP WHERE profile_id = $3 AND date = $4',
      [weight, waist, profileId, logDate]
    );
  } else {
    await pool.query(
      'UPDATE daily_logs SET weight = $1, updated_at = CURRENT_TIMESTAMP WHERE profile_id = $2 AND date = $3',
      [weight, profileId, logDate]
    );
  }
  
  return { date: logDate, weight, waist: waist ?? null };
}

// Tool: log_workout
async function logWorkout(profileId, params) {
  const { date, exercises } = params || {};
  
  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
    throw new Error('exercises array is required and must not be empty');
  }
  
  const logDate = date || getToday();
  const log = await getOrCreateLog(profileId, logDate);
  
  // Parse existing workout
  let existingExercises = [];
  if (log.workout) {
    try {
      existingExercises = JSON.parse(log.workout);
      if (!Array.isArray(existingExercises)) existingExercises = [];
    } catch (e) {
      existingExercises = [];
    }
  }
  
  // Format and add new exercises
  const newExercises = exercises.map(ex => ({
    id: Date.now() + Math.random(),
    name: ex.name,
    muscleGroup: ex.muscle_group || 'Other',
    sets: (ex.sets || []).map(s => ({
      id: Date.now() + Math.random(),
      weight: s.weight || '',
      reps: s.reps || '',
    })),
    completed: true,
    left_shoulder_pain: 0,
    elbow_pain: 0,
  }));
  
  const allExercises = [...existingExercises, ...newExercises];
  
  await pool.query(
    'UPDATE daily_logs SET workout = $1, updated_at = CURRENT_TIMESTAMP WHERE profile_id = $2 AND date = $3',
    [JSON.stringify(allExercises), profileId, logDate]
  );
  
  // Calculate total volume
  const totalVolume = newExercises.reduce((total, ex) => {
    return total + (ex.sets || []).reduce((vol, s) => {
      return vol + ((parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0));
    }, 0);
  }, 0);
  
  return {
    date: logDate,
    exercises_added: newExercises.length,
    total_exercises: allExercises.length,
    volume_added: Math.round(totalVolume),
  };
}

// Tool: log_skate_session
async function logSkateSession(profileId, params) {
  const { date, session_type, distance_miles, duration_minutes, switch_foot_minutes, weak_side_comfort, notes } = params || {};
  
  if (!session_type) {
    throw new Error('session_type is required (ldp, scogging, freestyle, long_session, switch_practice)');
  }
  
  const validTypes = ['ldp', 'scogging', 'freestyle', 'long_session', 'switch_practice'];
  if (!validTypes.includes(session_type)) {
    throw new Error(`Invalid session_type. Must be one of: ${validTypes.join(', ')}`);
  }
  
  const logDate = date || getToday();
  const log = await getOrCreateLog(profileId, logDate);
  
  // Parse existing skate sessions
  let sessions = [];
  if (log.skate_training) {
    try {
      sessions = JSON.parse(log.skate_training);
      if (!Array.isArray(sessions)) sessions = [];
    } catch (e) {
      sessions = [];
    }
  }
  
  const newSession = {
    id: Date.now() + Math.random(),
    session_type,
    distance_miles: distance_miles || 0,
    duration_minutes: duration_minutes || 0,
    switch_foot_minutes: switch_foot_minutes || 0,
    weak_side_comfort: weak_side_comfort || 5,
    notes: notes || '',
  };
  
  sessions.push(newSession);
  
  await pool.query(
    'UPDATE daily_logs SET skate_training = $1, updated_at = CURRENT_TIMESTAMP WHERE profile_id = $2 AND date = $3',
    [JSON.stringify(sessions), profileId, logDate]
  );
  
  // Calculate totals
  const totalMiles = sessions.reduce((sum, s) => sum + (s.distance_miles || 0), 0);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  
  return {
    date: logDate,
    session: newSession,
    day_totals: {
      sessions: sessions.length,
      total_miles: totalMiles,
      total_minutes: totalMinutes,
    },
  };
}

// Helper: calculate factor for macro scaling
function calculateFactor(amount, unit, servingSize, servingUnit) {
  const u = (unit || 'g').toLowerCase();
  const su = (servingUnit || 'g').toLowerCase();
  
  // Convert both to grams
  function toGrams(val, unitStr) {
    const n = parseFloat(val) || 0;
    const uLower = unitStr.toLowerCase();
    if (uLower === 'g' || uLower === 'gram' || uLower === 'grams') return n;
    if (uLower === 'oz' || uLower === 'ounce') return n * 28.3495;
    if (uLower === 'serving' || uLower === 'servings') return n * (parseFloat(servingSize) || 100);
    if (uLower === 'cup' || uLower === 'cups') return n * 240;
    if (uLower === 'tbsp') return n * 15;
    if (uLower === 'tsp') return n * 5;
    return n;
  }
  
  const amountG = toGrams(amount, u);
  const servingG = toGrams(servingSize, su);
  
  return servingG > 0 ? amountG / servingG : 0;
}

export default router;
