-- Remove legacy admin-created tickets (`user_id = 0`). Portal staff only see own tickets; admin manages staff submissions.
DELETE tc FROM ticket_channels tc
INNER JOIN tickets t ON t.id = tc.ticket_id
WHERE t.user_id = 0;

DELETE c FROM tickets_comments c
INNER JOIN tickets t ON t.id = c.ticket_id
WHERE t.user_id = 0;

DELETE d FROM ticket_alert_dismissals d
INNER JOIN tickets t ON t.id = d.ticket_id
WHERE t.user_id = 0;

DELETE FROM tickets WHERE user_id = 0;
