-- Fix bookmarks.tags: ARRAY → JSONB
-- Run this SQL on production database

BEGIN;

-- Backup first
CREATE TABLE IF NOT EXISTS bookmarks_backup_tags AS
SELECT * FROM bookmarks;

-- Convert ARRAY to JSONB
ALTER TABLE bookmarks
ALTER COLUMN tags TYPE JSONB
USING CASE
    WHEN tags IS NULL THEN NULL
    ELSE to_jsonb(tags)
END;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookmarks' AND column_name = 'tags';

COMMIT;

-- Done!
