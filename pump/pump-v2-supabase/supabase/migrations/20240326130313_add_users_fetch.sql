CREATE OR REPLACE FUNCTION get_user2(p_user TEXT)
RETURNS TABLE (
    "user" text,
    likes_received numeric,
    unread_notifs_count numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u."user",
        u.likes_received,
        COUNT(n.notification_id) FILTER (WHERE n.is_read = FALSE) AS unread_notifs_count
    FROM
        users2 u
    LEFT JOIN notifications n ON u."user" = n."user" AND n.is_read = FALSE
    WHERE u."user" = p_user
    GROUP BY u."user", u.likes_received;
END;
$$ LANGUAGE plpgsql;