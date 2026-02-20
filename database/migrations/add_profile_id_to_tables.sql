-- Migration: add_profile_id_to_tables
-- Date: 2025-02-16
-- Purpose: Multi-tenant: tie app_settings, daily_logs, and foods to profile_id. Each profile has separate data.

-- 1. app_settings: one row per profile (profile_id required)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS profile_id INTEGER NULL;
UPDATE app_settings SET profile_id = 1 WHERE profile_id IS NULL;
ALTER TABLE app_settings ALTER COLUMN profile_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_app_settings_profile'
  ) THEN
    ALTER TABLE app_settings ADD CONSTRAINT fk_app_settings_profile
      FOREIGN KEY (profile_id) REFERENCES profiles(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_app_settings_profile_id ON app_settings(profile_id);

-- 2. daily_logs: unique (profile_id, date); profile_id required
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS profile_id INTEGER NULL;
UPDATE daily_logs SET profile_id = 1 WHERE profile_id IS NULL;
ALTER TABLE daily_logs ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_date_key;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_daily_logs_profile'
  ) THEN
    ALTER TABLE daily_logs ADD CONSTRAINT fk_daily_logs_profile
      FOREIGN KEY (profile_id) REFERENCES profiles(id);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_profile_date ON daily_logs(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_profile_id ON daily_logs(profile_id);

-- 3. foods: profile_id nullable (NULL = USDA shared cache; non-null = custom food for that profile)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS profile_id INTEGER NULL;
UPDATE foods SET profile_id = 1 WHERE source = 'custom' AND profile_id IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_foods_profile'
  ) THEN
    ALTER TABLE foods ADD CONSTRAINT fk_foods_profile
      FOREIGN KEY (profile_id) REFERENCES profiles(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_foods_profile_id ON foods(profile_id);
