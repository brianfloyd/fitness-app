import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  try {
    console.log('Running migration: add_foods_table.sql');
    const path = join(__dirname, '../../database/migrations/add_foods_table.sql');
    const sql = readFileSync(path, 'utf8');
    await pool.query(sql);
    console.log('✅ add_foods_table migration completed.');
    const r = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'foods'`);
    if (r.rows.length) console.log('✅ Verified: foods table exists.');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
}

run();
