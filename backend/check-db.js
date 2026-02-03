import pool from './src/db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabase() {
  try {
    // Check if tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('app_settings', 'daily_logs')
      ORDER BY table_name
    `);
    
    console.log('Tables found:', result.rows.map(r => r.table_name));
    
    if (result.rows.length === 0) {
      console.log('\n❌ No tables found!');
      console.log('Please run: npm run setup-db');
      process.exit(1);
    } else if (result.rows.length < 2) {
      console.log('\n⚠️  Some tables are missing!');
      console.log('Please run: npm run setup-db');
      process.exit(1);
    }
    
    // Check if settings exist
    const settings = await pool.query('SELECT * FROM app_settings LIMIT 1');
    if (settings.rows.length === 0) {
      console.log('\n⚠️  No settings found. Default settings will be created on first use.');
    } else {
      console.log('\n✓ Settings found:', settings.rows[0]);
    }
    
    console.log('\n✅ Database is set up correctly!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkDatabase();
