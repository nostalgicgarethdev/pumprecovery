DROP FUNCTION IF EXISTS get_user2(TEXT);

CREATE OR REPLACE FUNCTION get_user2(p_username TEXT DEFAULT NULL, p_address TEXT DEFAULT NULL)
RETURNS TABLE (
    address TEXT,
    likes_received NUMERIC,
    unread_notifs_count BIGINT,
    mentions_received NUMERIC,
    username text,
    profile_image text,
    last_username_update_timestamp numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u."address",
        u.likes_received,
        COUNT(n.notification_id) FILTER (WHERE n.is_read = FALSE) AS unread_notifs_count,
        u.mentions_received,
        u.username,
        u.profile_image,
        u.last_username_update_timestamp
    FROM
        users2 u
    LEFT JOIN notifications n ON u."address" = n."user" AND n.is_read = FALSE
    WHERE 
        (p_address IS NOT NULL AND u."address" = p_address) OR
        (p_username IS NOT NULL AND u.username = p_username)
    GROUP BY u."address", u.likes_received, u.mentions_received, u.username, u.profile_image, u.last_username_update_timestamp;
END;
$$ LANGUAGE plpgsql;