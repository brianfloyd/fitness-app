import pool from './db/connection.js';
import { runMigrations } from './runMigrations.js';

/**
 * CLI: run the same migrations used on server startup (e.g. for a one-off sync).
 * Same list as runMigrations.js — used by server on every start (local and Railway).
 */
async function run() {
  try {
    console.log('Running all database migrations (same as server startup)...');
    await runMigrations();
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
