-- Header bell: staff dismiss an open-ticket alert (persists across browser sessions).
CREATE TABLE IF NOT EXISTS ticket_alert_dismissals (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  ticket_id INT UNSIGNED NOT NULL,
  dismissed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ticket_alert_dismiss_user (username, ticket_id),
  KEY idx_ticket_alert_dismiss_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
