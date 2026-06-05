-- Optional: allow subscriber ledger types on `transactions.type` (paid user create / recover).
-- Run once on the billing DB if inserts fail with invalid enum/data for SUBDBIT / SUBCRDT.
-- The app also falls back to DBIT when SUBDBIT is rejected.

-- Prefer widening to VARCHAR when the column is a legacy ENUM:
ALTER TABLE transactions MODIFY COLUMN type VARCHAR(32) NOT NULL;

-- Or extend ENUM explicitly (adjust list to match your existing values):
ALTER TABLE transactions MODIFY COLUMN type ENUM('DBIT','CRDT','BONUS','SUBDBIT','SUBCRDT') NOT NULL;
