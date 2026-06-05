-- One ticket can own multiple ITV channels (dashboard multi-select).
-- Run once on the billing DB. Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS ticket_channels (
  ticket_id INT UNSIGNED NOT NULL,
  channel_id INT UNSIGNED NOT NULL,
  channel_number INT UNSIGNED NOT NULL DEFAULT 0,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (ticket_id, channel_id),
  KEY idx_ticket_channels_ticket (ticket_id),
  KEY idx_ticket_channels_channel (channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
