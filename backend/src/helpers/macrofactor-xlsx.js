/**
 * MacroFactor Quick Export + Food Log xlsx parser.
 * Reusable for backend import and future in-app import.
 *
 * Quick Export: Date (Excel serial), Trend Weight, Weight, Calories, Protein, Fat, Carbs, Steps, ...
 * Use logged values only (exclude "Target" columns). Column order: Calories (kcal), then Target Calories (kcal), etc.
 * Food Log: Date (YYYY-MM-DD), Food Name, Serving Size, Serving Qty, Serving Weight (g), Calories, Fat, Carbs, Protein.
 * Food Log values are per-row totals (what was consumed for that log line).
 */

import XLSX from 'xlsx';

function excelDateToISO(v) {
  if (v == null) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const d = new Date((n - 25569) * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse MacroFactor xlsx buffer.
 * @param {Buffer} buf - File contents
 * @returns {{ quickExport: Map<string, object>, foodLog: Map<string, object[]> }}
 */
export function parseMacroFactorXlsx(buf) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const quickExport = new Map();
  const foodLog = new Map();

  if (wb.SheetNames.includes('Quick Export')) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Quick Export'], { header: 1, defval: '' });
    const headers = rows[0] || [];
    const dateIdx = headers.findIndex((h) => /date/i.test(String(h)));
    const trendIdx = headers.findIndex((h) => /trend\s*weight/i.test(String(h)));
    const weightIdx = headers.findIndex((h) => /^weight\s*\(/i.test(String(h)) && !/trend/i.test(String(h)));
    const calIdx = headers.findIndex((h) => /calories/i.test(String(h)) && !/target/i.test(String(h)));
    const protIdx = headers.findIndex((h) => /^protein\s*\(/i.test(String(h)) && !/target/i.test(String(h)));
    const fatIdx = headers.findIndex((h) => /^fat\s*\(/i.test(String(h)) && !/target/i.test(String(h)));
    const carbIdx = headers.findIndex((h) => /^carbs\s*\(/i.test(String(h)) && !/target/i.test(String(h)));
    const stepsIdx = headers.findIndex((h) => /steps/i.test(String(h)));

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const date = excelDateToISO(r[dateIdx]);
      if (!date) continue;
      quickExport.set(date, {
        date,
        trendWeight: num(r[trendIdx]) ?? null,
        weight: num(r[weightIdx]) ?? null,
        calories: num(r[calIdx]) ?? null,
        protein: num(r[protIdx]) ?? null,
        fat: num(r[fatIdx]) ?? null,
        carbs: num(r[carbIdx]) ?? null,
        steps: num(r[stepsIdx]) ?? null,
      });
    }
  }

  if (wb.SheetNames.includes('Food Log')) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Food Log'], { header: 1, defval: '' });
    const headers = rows[0] || [];
    const dateIdx = headers.findIndex((h) => /date/i.test(String(h)));
    const nameIdx = headers.findIndex((h) => /food\s*name/i.test(String(h)));
    const servSizeIdx = headers.findIndex((h) => /serving\s*size/i.test(String(h)));
    const servQtyIdx = headers.findIndex((h) => /serving\s*qty/i.test(String(h)));
    const servWeightIdx = headers.findIndex((h) => /serving\s*weight/i.test(String(h)));
    const calIdx = headers.findIndex((h) => /calories/i.test(String(h)));
    const fatIdx = headers.findIndex((h) => /^fat\s*\(/i.test(String(h)));
    const carbIdx = headers.findIndex((h) => /^carbs\s*\(/i.test(String(h)));
    const protIdx = headers.findIndex((h) => /^protein\s*\(/i.test(String(h)));

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const date = (r[dateIdx] || '').toString().trim().slice(0, 10);
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const name = (r[nameIdx] || '').toString().trim();
      if (!name) continue;
      const servingSize = (r[servSizeIdx] ?? '').toString().trim() || 'serving';
      const servingQty = num(r[servQtyIdx]) ?? 1;
      const servingWeightG = num(r[servWeightIdx]) ?? 100;
      const cal = num(r[calIdx]) ?? 0;
      const fat = num(r[fatIdx]) ?? 0;
      const carbs = num(r[carbIdx]) ?? 0;
      const protein = num(r[protIdx]) ?? 0;
      if (!foodLog.has(date)) foodLog.set(date, []);
      foodLog.get(date).push({
        name,
        servingSize,
        servingQty,
        servingWeightG,
        calories: cal,
        fat,
        carbs,
        protein,
      });
    }
  }

  return { quickExport, foodLog };
}

export { excelDateToISO, num };
