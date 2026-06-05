-- Portal staff messages (billing DB) — popup on manager/reseller/dealer login.
-- STB/subscriber messages remain in Stalker `events` only.
-- Run once on billing MySQL (staging then production).

CREATE TABLE IF NOT EXISTS portal_staff_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  audience_type ENUM('all_staff', 'managers', 'resellers', 'dealers', 'custom') NOT NULL,
  sent_by VARCHAR(64) NOT NULL,
  priority TINYINT UNSIGNED NOT NULL DEFAULT 2,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_portal_staff_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS portal_staff_message_recipients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id INT UNSIGNED NOT NULL,
  username VARCHAR(64) NOT NULL,
  user_type ENUM('MNGR', 'SRSLR', 'RSLR') NOT NULL,
  dismissed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portal_staff_msg_user (message_id, username),
  KEY idx_portal_staff_recipient_pending (username, dismissed_at),
  CONSTRAINT fk_portal_staff_msg FOREIGN KEY (message_id) REFERENCES portal_staff_messages (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
