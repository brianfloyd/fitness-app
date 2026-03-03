-- Migration: fix_foods_id_sequence
-- Purpose: Resync foods.id sequence so next INSERT gets a new id (avoids duplicate key on foods_pkey
--          when sequence is behind after imports or manual inserts).
-- Canon: 50-02-migrations.
-- Safe to run multiple times.

SELECT setval(
  pg_get_serial_sequence('foods', 'id'),
  COALESCE((SELECT MAX(id) FROM foods), 1)
);
