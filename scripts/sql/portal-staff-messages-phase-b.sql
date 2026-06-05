-- Phase B: operator-scoped staff audiences (manager / reseller downstream).
-- Run on billing MySQL after portal-staff-messages.sql.

ALTER TABLE portal_staff_messages
  MODIFY COLUMN audience_type ENUM(
    'all_staff',
    'managers',
    'resellers',
    'dealers',
    'custom',
    'downstream_all',
    'downstream_resellers',
    'downstream_dealers'
  ) NOT NULL;
