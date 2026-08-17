DROP FUNCTION IF EXISTS get_user2(TEXT);

CREATE OR REPLACE FUNCTION get_user2(p_user TEXT)
RETURNS TABLE (
    address TEXT,
    likes_received NUMERIC,
    unread_notifs_count BIGINT,
    mentions_received NUMERIC -- Adding the new column to the function's return type
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u."address",
        u.likes_received,
        COUNT(n.notification_id) FILTER (WHERE n.is_read = FALSE) AS unread_notifs_count,
        u.mentions_received -- Including the mentions_received in the SELECT statement
    FROM
        users2 u
    LEFT JOIN notifications n ON u."address" = n."user" AND n.is_read = FALSE
    WHERE u."address" = p_user
    GROUP BY u."address", u.likes_received, u.mentions_received; -- Including mentions_received in the GROUP BY clause
END;
$$ LANGUAGE plpgsql;