import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to prompt for password if missing
function promptPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question('Enter PostgreSQL password (or press Enter if no password): ', (password) => {
      rl.close();
      resolve(password || undefined);
    });
  });
}

async function getPassword() {
  let password = process.env.DB_PASSWORD;
  
  if (!password || password.trim() === '') {
    console.log('\n⚠️  DB_PASSWORD not set in .env file');
    password = await promptPassword();
  }
  
  return password;
}

const dbName = process.env.DB_NAME || 'fitness_db';

async function setupDatabase() {
  let client;
  
  try {
    // Get password (prompt if needed)
    const password = await getPassword();
    
    // Create pools with password
    const adminPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: password,
    });
    
    console.log('Connecting to PostgreSQL server...');
    client = await adminPool.connect();
    console.log('✓ Connected to PostgreSQL server');

    // Check if database exists
    console.log(`\nChecking if database '${dbName}' exists...`);
    const dbCheck = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Creating database '${dbName}'...`);
      // Terminate existing connections to the database if any
      await client.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [dbName]);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Database '${dbName}' created`);
    } else {
      console.log(`✓ Database '${dbName}' already exists`);
    }

    client.release();

    // Now connect to the fitness_db database
    console.log(`\nConnecting to database '${dbName}'...`);
    const dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: password,
    });

    const dbClient = await dbPool.connect();
    console.log(`✓ Connected to database '${dbName}'`);

    // Read and execute schema
    console.log('\nReading schema file...');
    const schemaPath = join(__dirname, '../../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');
    await dbClient.query(schema);
    console.log('✓ Schema executed successfully');

    // Verify tables were created
    console.log('\nVerifying tables...');
    const tables = await dbClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('app_settings', 'daily_logs')
      ORDER BY table_name
    `);

    console.log('✓ Tables created:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check default settings
    const settings = await dbClient.query('SELECT * FROM app_settings');
    if (settings.rows.length > 0) {
      console.log('\n✓ Default settings inserted:');
      console.log(`  - Total days: ${settings.rows[0].total_days}`);
      console.log(`  - Start date: ${settings.rows[0].start_date}`);
    }

    dbClient.release();
    await dbPool.end();
    await adminPool.end();

    console.log('\n✅ Database setup completed successfully!');
    console.log('\nYou can now start the backend server with: npm run dev');

  } catch (error) {
    console.error('\n❌ Error setting up database:');
    console.error(error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Tip: Check your DB_PASSWORD in the .env file');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure PostgreSQL is running and check DB_HOST/DB_PORT in .env');
    } else if (error.message.includes('role') || error.message.includes('user')) {
      console.error('\n💡 Tip: Check your DB_USER in the .env file');
    }
    
    if (client) {
      client.release();
    }
    await adminPool.end();
    process.exit(1);
  }
}

setupDatabase();
