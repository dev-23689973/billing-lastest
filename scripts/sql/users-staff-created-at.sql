-- Staff account creation timestamp (managers, resellers, dealers).
-- Run once on billing DB before deploying app that reads users.created_at.
--
-- If ALTER already succeeded but UPDATE failed, run only the UPDATE block below.

ALTER TABLE users
  ADD COLUMN created_at DATETIME NULL DEFAULT NULL
  AFTER last_login_time;

-- Backfill from earliest valid billing transaction (skip legacy zero dates — strict SQL mode rejects them).
UPDATE users u
INNER JOIN (
  SELECT username, MIN(`timestamp`) AS first_at
  FROM transactions
  WHERE `timestamp` IS NOT NULL
    AND `timestamp` > '1000-01-01 00:00:00'
  GROUP BY username
) t ON t.username = u.username
SET u.created_at = t.first_at
WHERE u.type IN ('MNGR', 'SRSLR', 'RSLR')
  AND u.created_at IS NULL;
