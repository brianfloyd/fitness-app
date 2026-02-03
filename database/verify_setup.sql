-- Verification queries to run after setup
-- Run these to confirm everything is set up correctly

-- 1. Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('app_settings', 'daily_logs')
ORDER BY table_name;

-- 2. Check app_settings table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'app_settings'
ORDER BY ordinal_position;

-- 3. Check daily_logs table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'daily_logs'
ORDER BY ordinal_position;

-- 4. Verify default settings were inserted
SELECT * FROM app_settings;

-- 5. Check indexes
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'daily_logs';

-- 6. Count records (should be 1 setting, 0 logs)
SELECT 
    'app_settings' as table_name,
    COUNT(*) as record_count
FROM app_settings
UNION ALL
SELECT 
    'daily_logs' as table_name,
    COUNT(*) as record_count
FROM daily_logs;
