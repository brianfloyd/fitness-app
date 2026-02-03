-- Migration: add_barcode_to_foods
-- Purpose: Store barcode/GTIN for custom foods; support duplicate check and search by barcode.
-- Reverse: ALTER TABLE foods DROP COLUMN IF EXISTS barcode; DROP INDEX IF EXISTS idx_foods_barcode;

ALTER TABLE foods ADD COLUMN IF NOT EXISTS barcode VARCHAR(32) NULL;
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode) WHERE barcode IS NOT NULL;
