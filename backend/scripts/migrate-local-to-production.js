/**
 * Migrate all database data from local (this app) to production (Railway).
 * Run from project root: cd backend && node scripts/migrate-local-to-production.js
 *
 * Prerequisites:
 * - Local .env (or backend/.env) has DB_* or DATABASE_URL for source.
 * - TARGET_DATABASE_URL set to Railway Postgres URL (from Railway dashboard or: railway variables).
 *
 * Example (PowerShell):
 *   $env:TARGET_DATABASE_URL = "postgresql://user:pass@host:port/railway"
 *   cd backend; node scripts/migrate-local-to-production.js
 *
 * The script truncates production tables then copies data. Production schema must
 * already exist (run migrations on Railway first if needed).
 */

import 'dotenv/config';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pool from '../src/db/connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TABLES = ['profiles', 'app_settings', 'daily_logs', 'foods'];

function getTargetPool() {
  const url = process.env.TARGET_DATABASE_URL;
  if (!url) {
    console.error('TARGET_DATABASE_URL is not set. Set it to your Railway Postgres URL.');
    console.error('Example: $env:TARGET_DATABASE_URL = "postgresql://..."');
    process.exit(1);
  }
  return new pg.Pool({ connectionString: url });
}

async function getColumnNames(client, table) {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = $1 
     ORDER BY ordinal_position`,
    [table]
  );
  return r.rows.map((row) => row.column_name);
}

function buildInsertSql(table, columns) {
  const cols = columns.join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  return `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
}

async function copyTable(sourceClient, targetClient, table) {
  const columns = await getColumnNames(sourceClient, table);
  if (columns.length === 0) {
    console.warn(`  Skipping ${table}: no columns found.`);
    return 0;
  }

  const selectResult = await sourceClient.query(`SELECT * FROM ${table}`);
  const rows = selectResult.rows;
  if (rows.length === 0) {
    await targetClient.query(`TRUNCATE TABLE ${table} RESTART IDENTITY`);
    console.log(`  ${table}: 0 rows (truncated target).`);
    return 0;
  }

  await targetClient.query(`TRUNCATE TABLE ${table} RESTART IDENTITY`);
  const insertSql = buildInsertSql(table, columns);

  for (const row of rows) {
    const values = columns.map((col) => row[col]);
    await targetClient.query(insertSql, values);
  }

  await targetClient.query(
    `SELECT setval(
       pg_get_serial_sequence($1::regclass, 'id'),
       (SELECT COALESCE(MAX(id), 1) FROM ${table})
     )`,
    [table]
  ).catch(() => {});

  console.log(`  ${table}: ${rows.length} rows copied.`);
  return rows.length;
}

async function run() {
  const targetPool = getTargetPool();
  const sourceClient = await pool.connect();
  const targetClient = await targetPool.connect();

  try {
    console.log('Source: local DB (backend .env)');
    console.log('Target: TARGET_DATABASE_URL (production)');
    console.log('Copying tables:', TABLES.join(', '));
    console.log('');

    for (const table of TABLES) {
      await copyTable(sourceClient, targetClient, table);
    }

    console.log('');
    console.log('Done. Production DB now has a copy of local data.');
    console.log('Use production (me profile) for your data; this local DB is now true dev.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    sourceClient.release();
    targetClient.release();
    await pool.end();
    await targetPool.end();
  }
  process.exit(0);
}

run();
