-- Fix column types that are too small for URLs and descriptions
ALTER TABLE IF EXISTS categories ALTER COLUMN description TYPE TEXT;
ALTER TABLE IF EXISTS categories ALTER COLUMN image_url TYPE TEXT;

-- Drop unique constraint on SKU (allows empty/null SKUs)
ALTER TABLE IF EXISTS product_variants DROP CONSTRAINT IF EXISTS ukq935p2d1pbjm39n0063ghnfgn;
ALTER TABLE IF EXISTS product_variants ALTER COLUMN sku DROP NOT NULL;
