-- Migration: add_recipes_tables
-- Purpose: Add recipes and recipe_ingredients tables for reusable food aggregates.
-- Canon: 20-04-database-schema, 50-02-migrations.
-- Run this migration (e.g. psql or your DB tool) so the recipes feature works. If you see
-- "relation 'recipes' does not exist", apply this file to your database.
-- Reverse:
--   DROP TABLE IF EXISTS recipe_ingredients;
--   DROP TABLE IF EXISTS recipes;

CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255) NULL,
  servings NUMERIC(10, 2) NOT NULL CHECK (servings > 0),
  total_calories NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_protein NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_fat NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_carbs NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scope recipes by profile; one user's recipes are not visible to others
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recipes_profile') THEN
    ALTER TABLE recipes ADD CONSTRAINT fk_recipes_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recipes_profile_id ON recipes(profile_id);
CREATE INDEX IF NOT EXISTS idx_recipes_name_lower ON recipes(LOWER(name));

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL,
  food_id INTEGER NULL,
  amount NUMERIC(12, 4) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  ingredient_json JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recipe_ingredients_recipe') THEN
    ALTER TABLE recipe_ingredients ADD CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recipe_ingredients_food') THEN
    ALTER TABLE recipe_ingredients ADD CONSTRAINT fk_recipe_ingredients_food FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

