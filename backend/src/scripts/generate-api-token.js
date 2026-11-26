#!/usr/bin/env node

/**
 * Generate API Token for MCP Server Authentication
 * 
 * This script generates a new API token for a profile and stores the hash in the database.
 * The plaintext token is displayed ONCE - the user must save it securely.
 * 
 * Usage: 
 *   node generate-api-token.js <profile_id>
 *   node generate-api-token.js --email <email>
 * 
 * Example:
 *   node generate-api-token.js 1
 *   node generate-api-token.js --email brian@example.com
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function generateToken(profileId, email) {
  try {
    let profile;
    
    if (email) {
      const result = await pool.query(
        'SELECT id, username, oauth_email FROM profiles WHERE oauth_email = $1 OR username = $1',
        [email]
      );
      if (result.rows.length === 0) {
        console.error(`Error: No profile found with email/username: ${email}`);
        process.exit(1);
      }
      profile = result.rows[0];
    } else {
      const result = await pool.query(
        'SELECT id, username, oauth_email FROM profiles WHERE id = $1',
        [profileId]
      );
      if (result.rows.length === 0) {
        console.error(`Error: No profile found with id: ${profileId}`);
        process.exit(1);
      }
      profile = result.rows[0];
    }
    
    console.log(`\nGenerating API token for profile:`);
    console.log(`  ID: ${profile.id}`);
    console.log(`  Username: ${profile.username || '(not set)'}`);
    console.log(`  Email: ${profile.oauth_email || '(not set)'}`);
    
    // Generate a secure random token
    const token = randomBytes(32).toString('base64url');
    
    // Hash it with bcrypt
    const hash = await bcrypt.hash(token, 10);
    
    // Store the hash in the database
    await pool.query(
      'UPDATE profiles SET api_token_hash = $1 WHERE id = $2',
      [hash, profile.id]
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('API TOKEN GENERATED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\nSAVE THIS TOKEN NOW - IT WILL NOT BE SHOWN AGAIN:\n');
    console.log(token);
    console.log('\n' + '='.repeat(60));
    console.log('\nTo use with MCP server, set the Authorization header:');
    console.log(`  Authorization: Bearer ${token}`);
    console.log('\nOr set the environment variable:');
    console.log(`  FITNESS_MCP_TOKEN=${token}`);
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (err) {
    console.error('Error generating token:', err.message);
    process.exit(1);
  }
}

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node generate-api-token.js <profile_id>');
  console.log('  node generate-api-token.js --email <email>');
  process.exit(1);
}

if (args[0] === '--email') {
  if (!args[1]) {
    console.error('Error: --email requires an email address');
    process.exit(1);
  }
  generateToken(null, args[1]);
} else {
  const profileId = parseInt(args[0], 10);
  if (isNaN(profileId)) {
    console.error('Error: Invalid profile ID');
    process.exit(1);
  }
  generateToken(profileId, null);
}
