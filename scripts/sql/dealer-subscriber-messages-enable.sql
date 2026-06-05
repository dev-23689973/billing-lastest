-- Reseller toggle: allow dealer to send STB (subscriber) messages from portal.
-- Default 1 keeps existing dealers able to message until a reseller turns it off.

ALTER TABLE users
  ADD COLUMN subscriber_messages_enable TINYINT(1) NOT NULL DEFAULT 1
  AFTER tickets_enable;
