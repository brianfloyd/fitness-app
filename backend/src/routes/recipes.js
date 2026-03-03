import express from 'express';
import pool from '../db/connection.js';

const router = express.Router();

/** Convert amount + unit to grams. servingSize/servingUnit used when unit is 'serving' or 'servings'. */
function toGrams(amount, unit, servingSize, servingUnit) {
  const n = parseFloat(amount) || 0;
  const u = (unit || 'g').toLowerCase().trim();
  if (u === 'g' || u === 'gram' || u === 'grams') return n;
  if (u === 'oz' || u === 'ounce' || u === 'ounces') return n * 28.3495;
  if (u === 'serving' || u === 'servings') {
    const servG = toGrams(servingSize || 100, servingUnit || 'g', null, null);
    return n * servG;
  }
  const volume = { cup: 240, cups: 240, tbsp: 15, tablespoon: 15, tsp: 5, teaspoon: 5, ml: 1 };
  if (volume[u] != null) return n * volume[u];
  return n;
}

/** Compute macro contribution for one ingredient. */
function ingredientMacros(amount, unit, servingSize, servingUnit, calories, protein, fat, carbs) {
  const servG = toGrams(servingSize || 100, servingUnit || 'g', null, null);
  const amountG = toGrams(amount, unit, servingSize, servingUnit);
  if (servG <= 0) return { calories: 0, protein: 0, fat: 0, carbs: 0 };
  const factor = amountG / servG;
  const cal = (parseFloat(calories) || 0) * factor;
  const prot = (parseFloat(protein) ?? 0) * factor;
  const f = (parseFloat(fat) ?? 0) * factor;
  const c = (parseFloat(carbs) ?? 0) * factor;
  return { calories: cal, protein: prot, fat: f, carbs: c };
}

// GET /api/recipes — list recipes for profile
router.get('/', async (req, res) => {
  try {
    const profileId = req.profileId;
    const result = await pool.query(
      `SELECT id, profile_id, name, brand, servings, total_calories, total_protein, total_fat, total_carbs, created_at, updated_at
       FROM recipes WHERE profile_id = $1 ORDER BY LOWER(name)`,
      [profileId]
    );
    const recipes = (result.rows || []).map((r) => ({
      id: r.id,
      profile_id: r.profile_id,
      name: r.name,
      brand: r.brand,
      servings: parseFloat(r.servings),
      total_calories: parseFloat(r.total_calories),
      total_protein: parseFloat(r.total_protein),
      total_fat: parseFloat(r.total_fat),
      total_carbs: parseFloat(r.total_carbs),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    res.json({ recipes });
  } catch (error) {
    console.error('Error listing recipes:', error);
    res.status(500).json({ error: error.message || 'Failed to list recipes' });
  }
});

// GET /api/recipes/:id — get one recipe with ingredients
router.get('/:id', async (req, res) => {
  try {
    const profileId = req.profileId;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid recipe ID' });
    const recipeRow = await pool.query(
      `SELECT id, profile_id, name, brand, servings, total_calories, total_protein, total_fat, total_carbs, created_at, updated_at
       FROM recipes WHERE id = $1 AND profile_id = $2`,
      [id, profileId]
    );
    if (recipeRow.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });
    const r = recipeRow.rows[0];
    const ingRows = await pool.query(
      `SELECT id, recipe_id, food_id, amount, unit, ingredient_json FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY id`,
      [id]
    );
    const ingredients = (ingRows.rows || []).map((i) => ({
      id: i.id,
      recipe_id: i.recipe_id,
      food_id: i.food_id,
      amount: parseFloat(i.amount),
      unit: i.unit,
      ingredient_json: i.ingredient_json,
    }));
    res.json({
      id: r.id,
      profile_id: r.profile_id,
      name: r.name,
      brand: r.brand,
      servings: parseFloat(r.servings),
      total_calories: parseFloat(r.total_calories),
      total_protein: parseFloat(r.total_protein),
      total_fat: parseFloat(r.total_fat),
      total_carbs: parseFloat(r.total_carbs),
      created_at: r.created_at,
      updated_at: r.updated_at,
      ingredients,
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch recipe' });
  }
});

// POST /api/recipes — create or update recipe; body: { id?, name, brand?, servings, ingredients: [{ food_id?, amount, unit, ingredient_json? }] }
router.post('/', async (req, res) => {
  try {
    const profileId = req.profileId;
    const { id: existingId, name, brand, servings, ingredients } = req.body || {};
    const n = (name || '').trim();
    if (!n) return res.status(400).json({ error: 'Recipe name is required' });
    const serv = parseFloat(servings);
    if (isNaN(serv) || serv <= 0) return res.status(400).json({ error: 'Servings must be a positive number' });
    const ingList = Array.isArray(ingredients) ? ingredients : [];

    let totalCal = 0, totalProt = 0, totalFat = 0, totalCarbs = 0;
    const resolvedIngredients = [];

    for (const ing of ingList) {
      const amount = parseFloat(ing.amount);
      const unit = (ing.unit || 'g').trim();
      if (isNaN(amount) || amount <= 0) continue;
      let servingSize = 100, servingUnit = 'g', cal = 0, prot = 0, fat = 0, carbs = 0, ingName = null;
      if (ing.ingredient_json && typeof ing.ingredient_json === 'object') {
        const j = ing.ingredient_json;
        servingSize = parseFloat(j.serving_size) ?? parseFloat(j.servingSize) ?? 100;
        servingUnit = (j.serving_unit || j.servingSizeUnit || 'g').trim();
        cal = parseFloat(j.calories) || 0;
        prot = parseFloat(j.protein) ?? 0;
        fat = parseFloat(j.fat) ?? 0;
        carbs = parseFloat(j.carbs) ?? 0;
        ingName = j.name || j.description || null;
      } else if (ing.food_id) {
        const foodRow = await pool.query(
          `SELECT name, serving_size, serving_unit, calories, protein, fat, carbs FROM foods WHERE id = $1`,
          [ing.food_id]
        );
        if (foodRow.rows.length === 0) continue;
        const f = foodRow.rows[0];
        ingName = f.name;
        servingSize = parseFloat(f.serving_size) || 100;
        servingUnit = (f.serving_unit || 'g').trim();
        cal = parseFloat(f.calories) || 0;
        prot = f.protein != null ? parseFloat(f.protein) : 0;
        fat = f.fat != null ? parseFloat(f.fat) : 0;
        carbs = f.carbs != null ? parseFloat(f.carbs) : 0;
      } else continue;
      const macros = ingredientMacros(amount, unit, servingSize, servingUnit, cal, prot, fat, carbs);
      totalCal += macros.calories;
      totalProt += macros.protein;
      totalFat += macros.fat;
      totalCarbs += macros.carbs;
      resolvedIngredients.push({
        food_id: ing.food_id || null,
        amount: ing.amount,
        unit,
        ingredient_json: ing.ingredient_json || {
          name: ingName,
          serving_size: servingSize,
          serving_unit: servingUnit,
          calories: cal,
          protein: prot,
          fat,
          carbs,
        },
      });
    }

    if (existingId) {
      const id = parseInt(existingId, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid recipe ID' });
      const existing = await pool.query('SELECT id FROM recipes WHERE id = $1 AND profile_id = $2', [id, profileId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });
      await pool.query(
        `UPDATE recipes SET name = $1, brand = $2, servings = $3, total_calories = $4, total_protein = $5, total_fat = $6, total_carbs = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 AND profile_id = $9`,
        [n, (brand || '').trim() || null, serv, totalCal, totalProt, totalFat, totalCarbs, id, profileId]
      );
      await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
      for (const ing of resolvedIngredients) {
        await pool.query(
          `INSERT INTO recipe_ingredients (recipe_id, food_id, amount, unit, ingredient_json) VALUES ($1, $2, $3, $4, $5)`,
          [id, ing.food_id, ing.amount, ing.unit, JSON.stringify(ing.ingredient_json)]
        );
      }
      const updated = await pool.query(
        `SELECT id, profile_id, name, brand, servings, total_calories, total_protein, total_fat, total_carbs, created_at, updated_at FROM recipes WHERE id = $1`,
        [id]
      );
      const row = updated.rows[0];
      return res.json({
        id: row.id,
        profile_id: row.profile_id,
        name: row.name,
        brand: row.brand,
        servings: parseFloat(row.servings),
        total_calories: parseFloat(row.total_calories),
        total_protein: parseFloat(row.total_protein),
        total_fat: parseFloat(row.total_fat),
        total_carbs: parseFloat(row.total_carbs),
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    }

    const insert = await pool.query(
      `INSERT INTO recipes (profile_id, name, brand, servings, total_calories, total_protein, total_fat, total_carbs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, profile_id, name, brand, servings, total_calories, total_protein, total_fat, total_carbs, created_at, updated_at`,
      [profileId, n, (brand || '').trim() || null, serv, totalCal, totalProt, totalFat, totalCarbs]
    );
    const recipeId = insert.rows[0].id;
    for (const ing of resolvedIngredients) {
      await pool.query(
        `INSERT INTO recipe_ingredients (recipe_id, food_id, amount, unit, ingredient_json) VALUES ($1, $2, $3, $4, $5)`,
        [recipeId, ing.food_id, ing.amount, ing.unit, JSON.stringify(ing.ingredient_json)]
      );
    }
    const row = insert.rows[0];
    res.status(201).json({
      id: row.id,
      profile_id: row.profile_id,
      name: row.name,
      brand: row.brand,
      servings: parseFloat(row.servings),
      total_calories: parseFloat(row.total_calories),
      total_protein: parseFloat(row.total_protein),
      total_fat: parseFloat(row.total_fat),
      total_carbs: parseFloat(row.total_carbs),
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({ error: error.message || 'Failed to save recipe' });
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', async (req, res) => {
  try {
    const profileId = req.profileId;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid recipe ID' });
    const result = await pool.query('DELETE FROM recipes WHERE id = $1 AND profile_id = $2 RETURNING id', [id, profileId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Recipe not found' });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: error.message || 'Failed to delete recipe' });
  }
});

export default router;
