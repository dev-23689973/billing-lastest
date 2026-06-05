-- =============================================================================
-- STEP A — Run this block first (select all lines below, Execute in DBeaver)
-- =============================================================================
-- Adds `accounts.credit` and fixes `last_active` if you hit error 1067.

SET @saved_sql_mode = @@SESSION.sql_mode;
SET SESSION sql_mode = TRIM(BOTH ',' FROM REPLACE(REPLACE(REPLACE(@@SESSION.sql_mode, 'NO_ZERO_DATE', ''), 'NO_ZERO_IN_DATE', ''), ',,', ','));

ALTER TABLE accounts
  MODIFY COLUMN last_active TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE accounts
  ADD COLUMN credit INT NOT NULL DEFAULT 0
  COMMENT 'Remaining scheduled auto-renew cycles'
  AFTER mark;

SET SESSION sql_mode = @saved_sql_mode;

-- Confirm (should show one row: credit | int):
-- SHOW COLUMNS FROM accounts LIKE 'credit';


-- =============================================================================
-- STEP B — Run only AFTER Step A succeeded (optional backfill from note tags)
-- =============================================================================
-- If you get "Unknown column 'credit'" you skipped Step A or ADD COLUMN failed.

/*
UPDATE accounts
SET credit = CAST(
  SUBSTRING_INDEX(SUBSTRING_INDEX(note, '@@AUTO_RENEW_REMAINING=', -1), '@@', 1) AS UNSIGNED
)
WHERE note LIKE '%@@AUTO_RENEW_REMAINING=%'
  AND mark = 1;
*/
