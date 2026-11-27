-- Migration: add_waist_and_skate_training
-- Date: 2026-11-26
-- Purpose: Add waist measurement to daily_logs and skate_training JSON column

-- Add waist measurement column
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS waist DECIMAL(5, 2);

-- Add skate training JSON column for LDP, scogging, freestyle sessions
-- Structure: { session_type, distance_miles, duration_minutes, switch_foot_minutes, weak_side_comfort, notes }
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS skate_training TEXT;

COMMENT ON COLUMN daily_logs.waist IS 'Waist measurement in inches for body composition tracking';
COMMENT ON COLUMN daily_logs.skate_training IS 'JSON array of skateboard training sessions';
