import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  try {
    console.log('Running migration: add_barcode_to_foods.sql');
    const path = join(__dirname, '../../database/migrations/add_barcode_to_foods.sql');
    const sql = readFileSync(path, 'utf8');
    await pool.query(sql);
    console.log('✅ add_barcode_to_foods migration completed.');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
}

run();
