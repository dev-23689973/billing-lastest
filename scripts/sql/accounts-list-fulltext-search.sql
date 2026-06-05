-- Optional legacy FULLTEXT index (not used by current app search — LIKE on table columns only).
-- Users list search: `lib/repos/accountListSearch.ts` (name, account, mac, displayed parent).
-- If this index already exists from an older deploy, it is safe to leave it; no migration required.

-- ALTER TABLE accounts
--   ADD FULLTEXT INDEX ft_accounts_list_search (full_name, mac, account, username, phone);
