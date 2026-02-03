/**
 * Import MacroFactor xlsx into fitness DB.
 * - Matches dates from Quick Export + Food Log.
 * - Creates custom foods for unknown foods; uses existing custom foods when (name, serving_size, serving_unit) match.
 * - Replaces foods for each matched day with Food Log entries; updates weight, protein, fat, carbs, steps from Quick Export.
 * - Preserves workout, strava, sleep_time, sleep_score, photo for existing logs.
 *
 * Calories/macros: Use MacroFactor-reported values only. Per-entry totals come from Food Log row
 * (Calories, Protein, Fat, Carbs) exactly. Per-serving = row / Serving Qty; scaling on edit uses
 * those values (no 4-4-9). Daily aggregates from Quick Export use logged columns (exclude Target).
 *
 * Run: node src/scripts/import-macrofactor.js <path-to-xlsx>
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../db/connection.js';
import { parseMacroFactorXlsx } from '../helpers/macrofactor-xlsx.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function calculateDayNumber(client, date) {
  const r = await client.query('SELECT start_date, total_days FROM app_settings ORDER BY id DESC LIMIT 1');
  if (!r.rows.length) return 1;
  const { start_date, total_days } = r.rows[0];
  const start = new Date(start_date);
  const log = new Date(date);
  start.setHours(0, 0, 0, 0);
  log.setHours(0, 0, 0, 0);
  const diff = Math.floor((log - start) / 864e5) + 1;
  return Math.max(1, Math.min(diff, total_days || 84));
}

function buildCustomFoodKey(name, servingSize) {
  return `${(name || '').toLowerCase().trim()}::${Number(servingSize)}`;
}

async function ensureCustomFood(client, cache, entry) {
  const name = (entry.name || '').trim();
  if (!name) return null;
  const qty = Math.max(1e-6, Number(entry.servingQty) || 1);
  const servingWeightG = Math.max(0.1, Number(entry.servingWeightG) || 100);
  const cal = Number(entry.calories) || 0;
  const fat = Number(entry.fat) || 0;
  const carbs = Number(entry.carbs) || 0;
  const protein = Number(entry.protein) || 0;
  const perServing = { cal: cal / qty, fat: fat / qty, carbs: carbs / qty, protein: protein / qty };

  const key = buildCustomFoodKey(name, servingWeightG);
  if (cache.has(key)) {
    const cf = cache.get(key);
    return { ...cf, cal: perServing.cal, protein: perServing.protein, fat: perServing.fat, carbs: perServing.carbs };
  }
  const sel = await client.query(
    `SELECT id FROM foods WHERE source = 'custom' AND LOWER(TRIM(name)) = LOWER($1) AND serving_size = $2 AND serving_unit = 'g'`,
    [name, servingWeightG]
  );
  let cf;
  if (sel.rows.length) {
    cf = { id: sel.rows[0].id, name, serving_size: servingWeightG, serving_unit: 'g', ...perServing };
  } else {
    const ins = await client.query(
      `INSERT INTO foods (source, name, serving_size, serving_unit, calories, protein, fat, carbs)
       VALUES ('custom', $1, $2, 'g', $3, $4, $5, $6)
       RETURNING id`,
      [name, servingWeightG, perServing.cal, perServing.protein, perServing.fat, perServing.carbs]
    );
    cf = { id: ins.rows[0].id, name, serving_size: servingWeightG, serving_unit: 'g', ...perServing };
  }
  cache.set(key, cf);
  return cf;
}

async function run() {
  const xlsxPath = process.argv[2];
  if (!xlsxPath) {
    console.error('Usage: node src/scripts/import-macrofactor.js <path-to-macrofactor.xlsx>');
    process.exit(1);
  }

  const buf = readFileSync(xlsxPath);
  const { quickExport, foodLog } = parseMacroFactorXlsx(buf);

  const dates = new Set([...quickExport.keys(), ...foodLog.keys()]);
  const sorted = [...dates].sort();

  if (!sorted.length) {
    console.log('No dates found in xlsx.');
    process.exit(0);
  }

    const client = await pool.connect();
    const foodCache = new Map();
  try {
    const existingLogs = await client.query(
      `SELECT date, fat_percent, workout, strava, sleep_time, sleep_score, photo, photo_mime_type
       FROM daily_logs WHERE date = ANY($1::date[])`,
      [sorted]
    );
    const byDate = new Map(
      existingLogs.rows.map((r) => [
        typeof r.date === 'string' ? r.date.slice(0, 10) : r.date?.toISOString?.()?.slice(0, 10) ?? String(r.date),
        r,
      ])
    );

    let created = 0;
    let updated = 0;

    for (const date of sorted) {
      const qe = quickExport.get(date) || {};
      const entries = foodLog.get(date) || [];
      const weight = qe.weight ?? qe.trendWeight ?? null;
      const protein = qe.protein ?? null;
      const fat = qe.fat ?? null;
      const carbs = qe.carbs ?? null;
      const steps = qe.steps ?? null;

      const foods = [];
      for (const e of entries) {
        const cf = await ensureCustomFood(client, foodCache, e);
        if (!cf) continue;
        const qty = Math.max(1e-6, Number(e.servingQty) || 1);
        // Use MacroFactor row totals exactly for stored entry (no recomputation).
        const tot = {
          calories: e.calories ?? (cf.cal || 0) * qty,
          protein: e.protein ?? (cf.protein || 0) * qty,
          fat: e.fat ?? (cf.fat || 0) * qty,
          carbs: e.carbs ?? (cf.carbs || 0) * qty,
        };
        const customFood = {
          serving_size: cf.serving_size,
          serving_unit: cf.serving_unit,
          calories: cf.cal,
          protein: cf.protein,
          fat: cf.fat,
          carbs: cf.carbs,
        };
        foods.push({
          id: `custom-${cf.id}-${Date.now()}-${Math.random()}`,
          customFoodId: cf.id,
          name: cf.name,
          brand: null,
          amount: qty,
          unit: 'serving',
          customFood,
          ...tot,
        });
      }

      const dayNumber = await calculateDayNumber(client, date);
      const foodsJson = JSON.stringify(foodLog.has(date) ? foods : []);

      const existing = byDate.get(date);
      if (existing) {
        await client.query(
          `UPDATE daily_logs SET day_number = $1, weight = $2, protein = $3, fat = $4, carbs = $5, foods = $6, steps = $7, updated_at = CURRENT_TIMESTAMP WHERE date = $8`,
          [dayNumber, weight, protein, fat, carbs, foodsJson, steps, date]
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO daily_logs (date, day_number, weight, protein, fat, carbs, foods, steps)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (date) DO UPDATE SET day_number = $2, weight = $3, protein = $4, fat = $5, carbs = $6, foods = $7, steps = $8, updated_at = CURRENT_TIMESTAMP`,
          [date, dayNumber, weight, protein, fat, carbs, foodsJson, steps]
        );
        created++;
      }
    }

    console.log(`Import done. Dates: ${sorted.length}. Created ${created} new logs, updated ${updated} existing.`);
  } finally {
    client.release();
    pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
