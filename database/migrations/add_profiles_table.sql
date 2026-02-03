-- Migration: add_profiles_table
-- Date: 2025-02-01
-- Purpose: Add profiles table for user/profiles (username + password, low security)

CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Seed default profile "me" with password "test" (low security, development only)
INSERT INTO profiles (username, password)
VALUES ('me', 'test')
ON CONFLICT (username) DO NOTHING;
