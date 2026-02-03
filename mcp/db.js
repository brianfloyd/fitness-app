/**
 * PostgreSQL connection pool for Fitness MCP tools.
 * Loads backend/.env; supports override via process.env (e.g. MCP config).
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve project root (parent of mcp/) then backend/.env
const projectRoot = join(__dirname, '..');
const envPath = join(projectRoot, 'backend', '.env');
dotenv.config({ path: envPath });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fitness_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}

export async function execute(text, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return { rowCount: res.rowCount };
  } finally {
    client.release();
  }
}

export function getPool() {
  return pool;
}
