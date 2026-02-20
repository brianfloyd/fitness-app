import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '../..');

const MIGRATIONS = [
  { name: 'schema.sql', path: join(root, 'database/schema.sql') },
  { name: 'add_foods_table.sql', path: join(root, 'database/migrations/add_foods_table.sql') },
  { name: 'add_profiles_table.sql', path: join(root, 'database/migrations/add_profiles_table.sql') },
  { name: 'add_foods_column.sql', path: join(root, 'database/migrations/add_foods_column.sql') },
  { name: 'add_barcode_to_foods.sql', path: join(root, 'database/migrations/add_barcode_to_foods.sql') },
  { name: 'add_profile_id_to_tables.sql', path: join(root, 'database/migrations/add_profile_id_to_tables.sql') },
];

async function run() {
  try {
    console.log('Running all database migrations...');
    for (const { name, path } of MIGRATIONS) {
      console.log(`  Running: ${name}`);
      const sql = readFileSync(path, 'utf8');
      await pool.query(sql);
      console.log(`  ✅ ${name} completed.`);
    }
    const r = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log('✅ All migrations complete. Tables:', r.rows.map((row) => row.table_name).join(', '));
    process.exit(0);
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  }
}

run();
