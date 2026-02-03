-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    total_days INTEGER NOT NULL DEFAULT 84,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    goal_photo BYTEA,
    goal_photo_mime_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_logs table
CREATE TABLE IF NOT EXISTS daily_logs (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    day_number INTEGER,
    photo BYTEA,
    photo_mime_type VARCHAR(50),
    weight DECIMAL(5, 2),
    fat_percent DECIMAL(5, 2),
    workout TEXT,
    protein DECIMAL(6, 2),
    fat DECIMAL(6, 2),
    carbs DECIMAL(6, 2),
    sleep_time TIME,
    sleep_score INTEGER,
    strava TEXT,
    steps INTEGER,
    foods TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);

-- Insert default settings if none exist
INSERT INTO app_settings (total_days, start_date)
SELECT 84, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM app_settings);
