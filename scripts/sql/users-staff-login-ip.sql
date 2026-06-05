-- Optional: staff login IP columns (skip if your DB already has them from PHP).
-- App reads `last_login_ip` + `current_login_ip`, or legacy `last_ip` + `ip`.

ALTER TABLE users
  ADD COLUMN last_login_ip VARCHAR(45) NULL DEFAULT NULL AFTER last_login_time,
  ADD COLUMN current_login_ip VARCHAR(45) NULL DEFAULT NULL AFTER current_login_time;
