-- Migration: add_program_settings
-- Date: 2026-11-26
-- Purpose: Add program phase settings and nutrition targets to app_settings

-- Program phase settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS ramp_start_date DATE;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS program_start_date DATE;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS block_duration_weeks INTEGER DEFAULT 4;

-- Nutrition targets
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS calorie_target_min INTEGER DEFAULT 2100;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS calorie_target_max INTEGER DEFAULT 2200;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS protein_target_min INTEGER DEFAULT 160;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS protein_target_max INTEGER DEFAULT 175;

-- Weekly flexible days (comma-separated day numbers: 0=Sun, 6=Sat)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS flexible_days VARCHAR(20) DEFAULT '0,6';

-- Ultraskate event date (configurable target event)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS ultraskate_date DATE;

-- Workout split (JSON defining muscle groups per day)
-- Default: Mon(1)=back/biceps, Tue(2)=chest/triceps, Wed(3)=shoulders, Thu(4)=legs, Fri(5)=upper
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS workout_split TEXT DEFAULT '{"1":"back,biceps","2":"chest,triceps","3":"shoulders","4":"legs","5":"back,biceps,chest,triceps,shoulders"}';

COMMENT ON COLUMN app_settings.ramp_start_date IS 'Start of ramp/intro week (50-60% effort)';
COMMENT ON COLUMN app_settings.program_start_date IS 'Start of full program with double progression blocks';
COMMENT ON COLUMN app_settings.block_duration_weeks IS 'Duration of each training block in weeks';
COMMENT ON COLUMN app_settings.flexible_days IS 'Days when nutrition targets are relaxed (0=Sun through 6=Sat)';
COMMENT ON COLUMN app_settings.ultraskate_date IS 'Target Ultraskate event date for countdown';
COMMENT ON COLUMN app_settings.workout_split IS 'JSON mapping day-of-week to muscle groups';
