-- Fix column types that are too small for URLs and descriptions
ALTER TABLE IF EXISTS categories ALTER COLUMN description TYPE TEXT;
ALTER TABLE IF EXISTS categories ALTER COLUMN image_url TYPE TEXT;
