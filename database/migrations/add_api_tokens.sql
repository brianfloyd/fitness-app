-- Migration: add_api_tokens
-- Purpose: Per-profile API tokens for MCP server authentication
-- Security: Tokens are hashed with bcrypt; never committed in code

-- Add api_token_hash column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_token_hash VARCHAR(255);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_profiles_api_token ON profiles(api_token_hash) WHERE api_token_hash IS NOT NULL;

-- Note: To generate a token for a profile:
-- 1. Generate a secure random token: openssl rand -base64 32
-- 2. Hash it with bcrypt
-- 3. Store the hash in api_token_hash
-- 4. Give the plaintext token to the user (they set it in their MCP client)
