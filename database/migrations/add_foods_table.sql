-- Migration: add_foods_table
-- Purpose: Foods cache (USDA lookups) + custom foods. Enables fast retrieval and custom food creation.
-- Canon: 20-04-database-schema, 50-02-migrations.
-- Reverse: DROP TABLE IF EXISTS foods;

CREATE TABLE IF NOT EXISTS foods (
  id SERIAL PRIMARY KEY,
  source VARCHAR(10) NOT NULL CHECK (source IN ('usda', 'custom')),
  fdc_id INTEGER UNIQUE NULL,
  name VARCHAR(500) NOT NULL,
  brand VARCHAR(255) NULL,
  serving_size DECIMAL(10, 2) NOT NULL,
  serving_unit VARCHAR(20) NOT NULL DEFAULT 'g',
  calories DECIMAL(8, 2) NOT NULL,
  protein DECIMAL(6, 2) NULL,
  fat DECIMAL(6, 2) NULL,
  carbs DECIMAL(6, 2) NULL,
  usda_data JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_foods_fdc_id ON foods(fdc_id);
CREATE INDEX IF NOT EXISTS idx_foods_source ON foods(source);
CREATE INDEX IF NOT EXISTS idx_foods_name_lower ON foods(LOWER(name));
