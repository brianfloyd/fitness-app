import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbName = process.env.DB_NAME || 'fitness_db';

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: dbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  let client;
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('✓ Connected to database');

    // Read and execute migration
    const migrationPath = join(__dirname, '../../database/add_goal_photo.sql');
    console.log('\nReading migration file...');
    const migration = readFileSync(migrationPath, 'utf8');

    console.log('Executing migration...');
    await client.query(migration);
    console.log('✓ Migration executed successfully');

    // Verify columns were added
    console.log('\nVerifying columns...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'app_settings' 
        AND column_name IN ('goal_photo', 'goal_photo_mime_type')
      ORDER BY column_name
    `);

    if (result.rows.length === 2) {
      console.log('✓ Columns verified:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('⚠️  Warning: Some columns may not have been added');
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running migration:');
    console.error(error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Tip: Check your DB_PASSWORD in the .env file');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure PostgreSQL is running and check DB_HOST/DB_PORT in .env');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runMigration();
