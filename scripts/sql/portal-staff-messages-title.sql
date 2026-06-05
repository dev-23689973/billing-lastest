-- Portal staff message subject/title (billing DB).
-- Run once after portal-staff-messages.sql.

ALTER TABLE portal_staff_messages
  ADD COLUMN title VARCHAR(200) NOT NULL DEFAULT '' AFTER id;
