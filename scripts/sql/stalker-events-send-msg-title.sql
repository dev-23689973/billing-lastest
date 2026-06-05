-- STB subscriber message title (Stalker DB `events` table).
-- Run once on the Stalker middleware database.

ALTER TABLE events
  ADD COLUMN title VARCHAR(200) NOT NULL DEFAULT '' AFTER msg;
