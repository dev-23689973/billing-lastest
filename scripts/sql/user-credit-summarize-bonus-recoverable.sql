-- Bonus months recoverable on end-user accounts (expiry-only recovery; no wallet refund).
-- Run once on billing DB when deploying separate credit/bonus recovery.

ALTER TABLE user_credit_summarize
  ADD COLUMN max_bonus_recoverable INT NOT NULL DEFAULT 0 AFTER max_credit_recoverable;
