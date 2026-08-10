-- ============================================================
-- Housekeeping task cleanup — run once in the Supabase SQL Editor
-- Deletes tasks whose description is clearly garbled: too many
-- special characters, no meaningful word content, or over-long.
-- Wrap in a transaction; ROLLBACK first to preview.
-- ============================================================

BEGIN;

-- Preview rows that will be affected before committing:
-- SELECT id, task FROM housekeeping_tasks
-- WHERE
--   task ~ '[-/\'"]{3,}'          -- 3+ consecutive dashes, slashes, or quotes
--   OR task ~ '[^a-zA-ZÀ-ɏ0-9\s.,!?():&]'  -- any now-blocked character
--   OR char_length(task) > 150;

DELETE FROM housekeeping_tasks
WHERE
  -- Three or more consecutive dashes, slashes, or quotes
  task ~ '[-/\'"]{3,}'
  -- Contains characters outside the new allowlist (dashes, slashes, quotes, semicolons, etc.)
  OR task ~ '[/\'"\\;`@#$%^*=+|<>{}\[\]~]'
  -- Longer than the new 150-char limit
  OR char_length(task) > 150;

COMMIT;
