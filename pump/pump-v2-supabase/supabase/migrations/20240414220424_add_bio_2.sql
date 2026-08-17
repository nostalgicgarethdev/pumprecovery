drop function get_user2(p_username text, p_address text);
CREATE OR REPLACE FUNCTION public.get_user2(
    p_username text DEFAULT NULL,
    p_address text DEFAULT NULL
)
RETURNS TABLE (
    address TEXT,
    likes_received numeric,
    unread_notifs_count bigint,
    mentions_received numeric,
    followers numeric,
    following numeric,
    username TEXT,
    profile_image TEXT,
    last_username_update_timestamp numeric,
    bio VARCHAR
) AS $$

BEGIN
    RETURN QUERY
    SELECT
        u."address",
        u.likes_received,
        COUNT(n.notification_id) FILTER (WHERE n.is_read = FALSE) AS unread_notifs_count,
        u.mentions_received,
        u.followers,
        u.following,
        u.username,
        u.profile_image,
        u.last_username_update_timestamp,
        u.bio
    FROM
        users2 u
    LEFT JOIN notifications n ON u."address" = n."user" AND n.is_read = FALSE
    WHERE 
        (p_address IS NOT NULL AND u."address" = p_address) OR
        (p_username IS NOT NULL AND u.username = p_username)
    GROUP BY u."address", u.likes_received, u.mentions_received, u.username, u.profile_image, u.last_username_update_timestamp, u.followers, u.following, u.following, u.bio;
END;
$$ LANGUAGE plpgsql;
