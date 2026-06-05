-- Users / subscribers list (`listAccountsPaged` / `listAccountsPagedScoped`) — additive indexes.
-- Run against the billing database (see DATABASE_NAME in .env).
-- Safe to skip statements that fail with "Duplicate key name".

-- Status + expiry filters (active, expired, expiring, inactive).
ALTER TABLE accounts
  ADD INDEX idx_accounts_status_expires (status, expires);

-- Dealer-owned subscribers (`a.username` / dealer branch filters).
ALTER TABLE accounts
  ADD INDEX idx_accounts_username (username);

-- Common sort columns (ORDER BY).
ALTER TABLE accounts
  ADD INDEX idx_accounts_created (created);

ALTER TABLE accounts
  ADD INDEX idx_accounts_expires_sort (expires);

ALTER TABLE accounts
  ADD INDEX idx_accounts_account (account);

-- Hierarchy joins (`users` as dealer / reseller).
ALTER TABLE users
  ADD INDEX idx_users_type_username (type, username);

ALTER TABLE users
  ADD INDEX idx_users_type_username_owner (type, username_owner);

-- Text search: run `accounts-list-fulltext-search.sql` for FULLTEXT on account fields.
-- Short queries (<3 chars) and hierarchy logins still use LIKE in application code.
