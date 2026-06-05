/** Shared SELECT body for dashboard ticket table rows (latest comment + count via joins). */
export const TICKET_TABLE_SELECT_SQL = `
       t.id,
       t.subject,
       t.content,
       t.status_id,
       t.priority_id,
       t.category_id,
       t.channel_number,
       t.channel_id,
       t.created_at,
       t.updated_at,
       t.user_id,
       t.agent_id,
       CASE
         WHEN t.user_id = 0 THEN 'admin'
         ELSE COALESCE(owner.username, CONCAT('user#', t.user_id))
       END AS creator_username,
       CASE
         WHEN t.agent_id = 0 THEN 'admin'
         ELSE COALESCE(agent.username, CONCAT('user#', t.agent_id))
       END AS agent_username,
       COALESCE(lc.content, '') AS latest_comment,
       COALESCE(
         CASE
           WHEN lc.user_id = 0 THEN 'admin'
           ELSE COALESCE(lc_author.username, CONCAT('user#', lc.user_id))
         END,
         ''
       ) AS latest_comment_user,
       COALESCE(cc.comment_count, 0) AS comment_count`;

export const TICKET_TABLE_FROM_SQL = `
     FROM tickets t
     LEFT JOIN users owner ON owner.id = t.user_id
     LEFT JOIN users agent ON agent.id = t.agent_id
     LEFT JOIN (
       SELECT tc1.ticket_id, tc1.content, tc1.user_id
       FROM tickets_comments tc1
       LEFT JOIN tickets_comments tc2
         ON tc2.ticket_id = tc1.ticket_id
         AND (
           tc2.created_at > tc1.created_at
           OR (tc2.created_at = tc1.created_at AND tc2.id > tc1.id)
         )
       WHERE tc2.id IS NULL
     ) lc ON lc.ticket_id = t.id
     LEFT JOIN users lc_author ON lc_author.id = lc.user_id
     LEFT JOIN (
       SELECT ticket_id, COUNT(*) AS comment_count
       FROM tickets_comments
       GROUP BY ticket_id
     ) cc ON cc.ticket_id = t.id`;

/** Fallback when tickets_comments is missing or comment joins fail on older MySQL. */
export const TICKET_TABLE_SELECT_SQL_MINIMAL = `
       t.id,
       t.subject,
       t.content,
       t.status_id,
       t.priority_id,
       t.category_id,
       t.channel_number,
       t.channel_id,
       t.created_at,
       t.updated_at,
       t.user_id,
       t.agent_id,
       CASE
         WHEN t.user_id = 0 THEN 'admin'
         ELSE COALESCE(owner.username, CONCAT('user#', t.user_id))
       END AS creator_username,
       CASE
         WHEN t.agent_id = 0 THEN 'admin'
         ELSE COALESCE(agent.username, CONCAT('user#', t.agent_id))
       END AS agent_username,
       '' AS latest_comment,
       '' AS latest_comment_user,
       0 AS comment_count`;

export const TICKET_TABLE_FROM_SQL_MINIMAL = `
     FROM tickets t
     LEFT JOIN users owner ON owner.id = t.user_id
     LEFT JOIN users agent ON agent.id = t.agent_id`;
