import express from 'express';
import dotenv from 'dotenv';
import pool from '../db/connection.js';

dotenv.config();

const router = express.Router();
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = process.env.USDA_API_KEY;

if (!USDA_API_KEY) {
  console.warn('Warning: USDA_API_KEY not found in environment variables');
}

// Check if fetch is available (Node.js 18+ has native fetch)
if (typeof fetch === 'undefined') {
  console.error('Error: fetch is not available. Please use Node.js 18+ or install node-fetch');
}

// Helper function to make USDA API requests
async function makeUSDARequest(endpoint, options = {}) {
  if (!USDA_API_KEY) {
    throw new Error('USDA API key not configured');
  }

  const url = `${USDA_API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${USDA_API_KEY}`;
  
  try {
    if (typeof fetch === 'undefined') {
      throw new Error('fetch is not available. Please use Node.js 18+ or install node-fetch');
    }
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `USDA API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch (e) {
        if (errorText) errorMessage = errorText;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Re-throw if it's already a properly formatted error
    if (error instanceof Error && error.message && error.message.includes('USDA API')) {
      throw error;
    }
    
    // Better error handling for network/connection errors
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message || error.toString();
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = String(error);
      }
    }
    
    console.error('USDA API request error:', {
      endpoint,
      url,
      error: errorMessage,
      errorType: error?.constructor?.name,
      stack: error?.stack
    });
    
    throw new Error(`Failed to connect to USDA API: ${errorMessage}`);
  }
}

// Search foods: DB custom foods + USDA API. Merge and return unified { foods }.
router.get('/search', async (req, res) => {
  try {
    const { query, gtin, dataType, pageSize = 50 } = req.query;
    
    if (!query && !gtin) {
      return res.status(400).json({ error: 'Query or GTIN parameter is required' });
    }

    const searchQuery = (query || gtin || '').trim();
    const pageSizeNum = parseInt(pageSize) || 50;
    let customFoods = [];

    const mapRow = (r) => ({
      customFoodId: r.id,
      description: r.name,
      brandOwner: r.brand || null,
      gtinUpc: r.barcode || null,
      source: 'custom',
      servingSize: parseFloat(r.serving_size),
      servingSizeUnit: r.serving_unit,
      calories: parseFloat(r.calories),
      protein: r.protein != null ? parseFloat(r.protein) : null,
      fat: r.fat != null ? parseFloat(r.fat) : null,
      carbs: r.carbs != null ? parseFloat(r.carbs) : null,
    });

    if (searchQuery.length >= 2) {
      try {
        if (gtin && searchQuery.length >= 8) {
          const bc = searchQuery.replace(/^0+/, '');
          const byBarcode = await pool.query(
            `SELECT id, name, brand, barcode, serving_size, serving_unit, calories, protein, fat, carbs
             FROM foods WHERE source = 'custom' AND (barcode = $1 OR barcode = '0' || $1)
             ORDER BY name LIMIT 20`,
            [bc]
          );
          customFoods = (byBarcode.rows || []).map(mapRow);
        }
        if (!gtin) {
          const byName = await pool.query(
            `SELECT id, name, brand, barcode, serving_size, serving_unit, calories, protein, fat, carbs
             FROM foods WHERE source = 'custom' AND (LOWER(name) LIKE $1 OR (brand IS NOT NULL AND LOWER(brand) LIKE $1))
             ORDER BY name LIMIT 20`,
            ['%' + searchQuery.toLowerCase() + '%']
          );
          const byNameRows = (byName.rows || []).map(mapRow);
          const seen = new Set(customFoods.map(f => f.customFoodId));
          byNameRows.forEach(r => { if (!seen.has(r.customFoodId)) { seen.add(r.customFoodId); customFoods.push(r); } });
        }
      } catch (e) {
        console.debug('Custom foods search failed:', e.message);
      }
    }

    // USDA search
    const searchCriteria = {
      query: searchQuery || gtin,
      pageSize: pageSizeNum,
    };
    if (dataType) {
      searchCriteria.dataType = Array.isArray(dataType) ? dataType : [dataType];
    }

    let usdaFoods = [];
    try {
      const results = await makeUSDARequest('/foods/search', {
        method: 'POST',
        body: searchCriteria,
      });
      usdaFoods = results.foods || [];
    } catch (e) {
      console.warn('USDA search failed:', e.message);
    }

    // GTIN filter for USDA results
    if (gtin && usdaFoods.length) {
      const exact = usdaFoods.find(f => 
        f.gtinUpc === gtin || f.gtinUpc === `0${gtin}` || f.gtinUpc === (gtin || '').replace(/^0+/, '')
      );
      usdaFoods = exact ? [exact] : usdaFoods.filter(f => f.gtinUpc && f.gtinUpc.includes(gtin));
    }

    // Merge: custom first, then USDA
    const foods = [...customFoods, ...usdaFoods];
    res.json({ foods });
  } catch (error) {
    console.error('Error searching foods:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: errorMessage || 'Failed to search foods',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Check for potential duplicate custom foods (by name or barcode). Must be before /custom/:id.
router.get('/custom/check', async (req, res) => {
  try {
    const { name, barcode } = req.query || {};
    const n = (name || '').trim();
    const bc = (barcode || '').trim().replace(/^0+/, '') || null;
    if (!n && !bc) {
      return res.status(400).json({ error: 'Name or barcode is required' });
    }
    const conditions = [];
    const params = [];
    let i = 1;
    if (n.length >= 2) {
      conditions.push(`(LOWER(name) LIKE $${i} OR (brand IS NOT NULL AND LOWER(brand) LIKE $${i}))`);
      params.push('%' + n.toLowerCase() + '%');
      i++;
    }
    if (bc && bc.length >= 8) {
      conditions.push(`(barcode = $${i} OR barcode = '0' || $${i})`);
      params.push(bc);
      i++;
    }
    if (!conditions.length) {
      return res.json({ matches: [] });
    }
    const result = await pool.query(
      `SELECT id, name, brand, barcode, serving_size, serving_unit, calories, protein, fat, carbs
       FROM foods WHERE source = 'custom' AND (${conditions.join(' OR ')})
       ORDER BY name LIMIT 20`,
      params
    );
    const matches = (result.rows || []).map(r => ({
      id: r.id,
      customFoodId: r.id,
      name: r.name,
      brand: r.brand || null,
      barcode: r.barcode || null,
      serving_size: parseFloat(r.serving_size),
      serving_unit: r.serving_unit,
      calories: parseFloat(r.calories),
      protein: r.protein != null ? parseFloat(r.protein) : null,
      fat: r.fat != null ? parseFloat(r.fat) : null,
      carbs: r.carbs != null ? parseFloat(r.carbs) : null,
      source: 'custom',
    }));
    res.json({ matches });
  } catch (e) {
    console.error('Custom check error:', e);
    res.status(500).json({ error: e.message || 'Check failed' });
  }
});

// Create custom food
router.post('/custom', async (req, res) => {
  try {
    const { name, brand, barcode, serving_size, serving_unit, calories, protein, fat, carbs } = req.body || {};
    const n = (name || '').trim();
    const su = ((serving_unit || 'g').trim().toLowerCase());
    if (su !== 'g' && su !== 'oz') {
      return res.status(400).json({ error: 'Serving unit must be g or oz (1 serving = X g or X oz)' });
    }
    const cal = parseFloat(calories);

    if (!n) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (isNaN(cal) || cal < 0) {
      return res.status(400).json({ error: 'Calories is required and must be a non‑negative number' });
    }
    const ss = parseFloat(serving_size);
    if (isNaN(ss) || ss <= 0) {
      return res.status(400).json({ error: 'Serving size is required and must be a positive number' });
    }
    const bc = (barcode || '').trim() || null;

    const result = await pool.query(
      `INSERT INTO foods (source, name, brand, barcode, serving_size, serving_unit, calories, protein, fat, carbs)
       VALUES ('custom', $1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, brand, barcode, serving_size, serving_unit, calories, protein, fat, carbs, created_at`,
      [
        n,
        (brand || '').trim() || null,
        bc,
        ss,
        su,
        cal,
        protein != null && !isNaN(parseFloat(protein)) ? parseFloat(protein) : null,
        fat != null && !isNaN(parseFloat(fat)) ? parseFloat(fat) : null,
        carbs != null && !isNaN(parseFloat(carbs)) ? parseFloat(carbs) : null,
      ]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      customFoodId: row.id,
      name: row.name,
      brand: row.brand,
      barcode: row.barcode || null,
      serving_size: parseFloat(row.serving_size),
      serving_unit: row.serving_unit,
      calories: parseFloat(row.calories),
      protein: row.protein != null ? parseFloat(row.protein) : null,
      fat: row.fat != null ? parseFloat(row.fat) : null,
      carbs: row.carbs != null ? parseFloat(row.carbs) : null,
      source: 'custom',
    });
  } catch (error) {
    console.error('Error creating custom food:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create custom food',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get custom food by id
router.get('/custom/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid custom food ID' });
    }
    const result = await pool.query(
      `SELECT id, name, brand, barcode, serving_size, serving_unit, calories, protein, fat, carbs
       FROM foods WHERE source = 'custom' AND id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom food not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      customFoodId: row.id,
      name: row.name,
      brand: row.brand,
      barcode: row.barcode || null,
      serving_size: parseFloat(row.serving_size),
      serving_unit: row.serving_unit,
      calories: parseFloat(row.calories),
      protein: row.protein != null ? parseFloat(row.protein) : null,
      fat: row.fat != null ? parseFloat(row.fat) : null,
      carbs: row.carbs != null ? parseFloat(row.carbs) : null,
      source: 'custom',
    });
  } catch (error) {
    console.error('Error fetching custom food:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch custom food' });
  }
});

// Get food details by FDC ID (check cache first, then USDA)
router.get('/:fdcId', async (req, res) => {
  try {
    const { fdcId } = req.params;
    const { format = 'full' } = req.query;

    if (!fdcId) {
      return res.status(400).json({ error: 'FDC ID is required' });
    }

    const fid = parseInt(fdcId, 10);
    if (isNaN(fid)) {
      return res.status(400).json({ error: 'Invalid FDC ID' });
    }

    try {
      const cached = await pool.query(
        'SELECT usda_data FROM foods WHERE source = \'usda\' AND fdc_id = $1',
        [fid]
      );
      if (cached.rows.length > 0 && cached.rows[0].usda_data) {
        return res.json(cached.rows[0].usda_data);
      }
    } catch (e) {
      console.debug('Foods cache lookup failed:', e.message);
    }

    const food = await makeUSDARequest(`/food/${fdcId}?format=${format}`);

    try {
      const name = food.description || food.brandOwner || 'Unknown';
      const brand = food.brandOwner || null;
      const serving = food.servingSize != null ? food.servingSize : 100;
      const servingUnit = (food.servingSizeUnit || 'g').toLowerCase();
      let cal = 0, prot = null, fatVal = null, carb = null;
      (food.foodNutrients || []).forEach(n => {
        const id = n.nutrient?.id ?? n.nutrientId;
        const v = n.amount ?? n.value ?? 0;
        if (id === 1008) cal = v; else if (id === 1003) prot = v; else if (id === 1004) fatVal = v; else if (id === 1005) carb = v;
      });
      if (!cal && (prot || fatVal || carb)) {
        cal = (prot || 0) * 4 + (fatVal || 0) * 9 + (carb || 0) * 4;
      }
      await pool.query(
        `INSERT INTO foods (source, fdc_id, name, brand, serving_size, serving_unit, calories, protein, fat, carbs, usda_data, updated_at)
         VALUES ('usda', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         ON CONFLICT (fdc_id) DO UPDATE SET
           name = EXCLUDED.name, brand = EXCLUDED.brand, serving_size = EXCLUDED.serving_size, serving_unit = EXCLUDED.serving_unit,
           calories = EXCLUDED.calories, protein = EXCLUDED.protein, fat = EXCLUDED.fat, carbs = EXCLUDED.carbs,
           usda_data = EXCLUDED.usda_data, updated_at = CURRENT_TIMESTAMP`,
        [fid, name, brand, serving, servingUnit, cal, prot, fatVal, carb, JSON.stringify(food)]
      );
    } catch (e) {
      console.warn('Failed to cache USDA food:', e.message);
    }

    res.json(food);
  } catch (error) {
    console.error('Error fetching food details:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch food details' });
  }
});

// Batch get multiple food details
router.post('/batch', async (req, res) => {
  try {
    const { fdcIds } = req.body;

    if (!Array.isArray(fdcIds) || fdcIds.length === 0) {
      return res.status(400).json({ error: 'fdcIds array is required' });
    }

    // Limit batch size to avoid overwhelming the API
    if (fdcIds.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 food IDs per batch request' });
    }

    const foods = await makeUSDARequest('/foods', {
      method: 'POST',
      body: { fdcIds },
    });

    res.json(foods);
  } catch (error) {
    console.error('Error fetching batch food details:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch batch food details' });
  }
});

export default router;
