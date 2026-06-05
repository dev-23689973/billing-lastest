-- Ticket dashboard table list (/api/tickets/table) — additive indexes.
-- Run after tickets-db-hardening.sql if those indexes already exist.
-- Safe to skip lines that error with "Duplicate key name" if an index already exists.

-- Covers ORDER BY t.updated_at DESC, t.id DESC and status-filtered sorts.
ALTER TABLE tickets
  ADD INDEX idx_tickets_updated_id (updated_at, id);

-- Covers latest-comment window (PARTITION BY ticket_id ORDER BY created_at DESC, id DESC).
ALTER TABLE tickets_comments
  ADD INDEX idx_ticket_comments_ticket_created_id (ticket_id, created_at, id);
