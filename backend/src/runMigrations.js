import { readFileSync, existsSync } from 'fs';
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
  { name: 'add_fitbit_tokens.sql', path: join(root, 'database/migrations/add_fitbit_tokens.sql') },
  { name: 'add_oauth_email_to_profiles.sql', path: join(root, 'database/migrations/add_oauth_email_to_profiles.sql') },
  { name: 'add_recipes_tables.sql', path: join(root, 'database/migrations/add_recipes_tables.sql') },
  { name: 'fix_foods_id_sequence.sql', path: join(root, 'database/migrations/fix_foods_id_sequence.sql') },
];

/**
 * Run all migrations on startup. Used by server.js (local and Railway).
 * If a migration fails (e.g. already applied), log and continue so the server still starts.
 * @returns {Promise<void>}
 */
export async function runMigrations() {
  for (const { name, path } of MIGRATIONS) {
    if (!existsSync(path)) {
      console.warn(`[migrations] Skip ${name} (file not found)`);
      continue;
    }
    try {
      const sql = readFileSync(path, 'utf8');
      await pool.query(sql);
      console.log(`[migrations] ${name}`);
    } catch (e) {
      // Already applied (e.g. relation/constraint exists) or other DB error: log and continue
      console.warn(`[migrations] ${name}:`, e.message);
    }
  }
}
