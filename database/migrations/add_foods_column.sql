-- Add foods column to daily_logs table
-- This column stores food entries as JSON, similar to workout and strava columns

ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS foods TEXT;

-- Update existing records to have null foods
UPDATE daily_logs SET foods = NULL WHERE foods IS NULL;
