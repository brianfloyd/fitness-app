-- Add goal photo fields to app_settings table
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS goal_photo BYTEA,
ADD COLUMN IF NOT EXISTS goal_photo_mime_type VARCHAR(50);
