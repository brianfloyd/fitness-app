/**
 * Inspect MacroFactor export xlsx: list sheet names, headers, and sample rows.
 * Run: node src/scripts/inspect-macrofactor-xlsx.js <path-to-xlsx>
 */
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = process.argv[2] || 'MacroFactor-20260129141432.xlsx';
const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: 'buffer' });

function excelDateToISO(v) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const d = new Date((n - 25569) * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

console.log('Sheet names:', wb.SheetNames);
console.log('');

// Quick Export
const qe = XLSX.utils.sheet_to_json(wb.Sheets['Quick Export'], { header: 1, defval: '' });
console.log('--- Quick Export ---');
console.log('Headers:', qe[0]?.slice(0, 14));
for (let i = 1; i < Math.min(6, qe.length); i++) {
  const r = qe[i];
  const date = excelDateToISO(r[0]);
  console.log(`Row ${i}: date=${r[0]} -> ${date}, expend=${r[1]}, trendW=${r[2]}, weight=${r[3]}, cal=${r[4]}, p=${r[5]}, f=${r[6]}, c=${r[7]}, steps=${r[12]}`);
}
console.log('');

// Food Log
const fl = XLSX.utils.sheet_to_json(wb.Sheets['Food Log'], { header: 1, defval: '' });
console.log('--- Food Log ---');
console.log('Headers:', fl[0]?.slice(0, 11));
const byDate = new Map();
for (let i = 1; i < fl.length; i++) {
  const r = fl[i];
  const d = (r[0] || '').toString().slice(0, 10);
  if (!d) continue;
  if (!byDate.has(d)) byDate.set(d, []);
  byDate.get(d).push({ name: r[2], servingSize: r[3], servingQty: r[4], servingWeightG: r[5], cal: r[6], fat: r[7], carbs: r[8], protein: r[9] });
}
console.log('Dates in Food Log:', [...byDate.keys()].sort().join(', '));
for (const [d, entries] of [...byDate.entries()].slice(0, 3)) {
  console.log(`\nDate ${d}: ${entries.length} entries`);
  entries.slice(0, 5).forEach((e, i) => console.log(`  ${i + 1}. ${e.name} | serving=${e.servingSize} qty=${e.servingQty} weight=${e.servingWeightG}g | cal=${e.cal} p=${e.protein} f=${e.fat} c=${e.carbs}`));
}
