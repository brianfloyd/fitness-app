import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('Running migration: add_profiles_table.sql');

    const migrationPath = join(__dirname, '../../database/migrations/add_profiles_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);

    console.log('✅ Profiles migration completed successfully!');

    const result = await pool.query('SELECT id, username FROM profiles');
    console.log('Profiles:', result.rows);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
