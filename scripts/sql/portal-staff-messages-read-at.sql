-- Portal staff inbox: active → dismiss (dismissed_at) → read (read_at, locked).
-- Run once on billing MySQL after portal-staff-messages.sql.

ALTER TABLE portal_staff_message_recipients
  ADD COLUMN read_at DATETIME NULL DEFAULT NULL AFTER dismissed_at;
dealers