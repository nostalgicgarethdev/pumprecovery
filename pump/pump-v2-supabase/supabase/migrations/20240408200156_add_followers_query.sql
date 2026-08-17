drop function if exists get_followers(text);
CREATE OR REPLACE FUNCTION get_followers(user_address TEXT)
RETURNS TABLE(
    username TEXT,
    profile_image TEXT,
    address TEXT,
    "timestamp" BIGINT,
    followers INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.username,
        u.profile_image,
        f.user_id AS address,
        f."timestamp",
        u.followers
    FROM
        following f
    LEFT JOIN
        users2 u ON f.user_id = u.address
    WHERE
        f.following_id = user_address
    ORDER BY
        u.followers DESC;
END;
$$ LANGUAGE plpgsql;

drop function if exists get_following(text);
CREATE OR REPLACE FUNCTION get_following(user_address TEXT)
RETURNS TABLE(
    username TEXT,
    profile_image TEXT,
    address TEXT,
    "timestamp" BIGINT,
    followers INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.username,
        u.profile_image,
        f.following_id AS address,
        f."timestamp",
        u.followers
    FROM
        following f
    LEFT JOIN
        users2 u ON f.following_id = u.address
    WHERE
        f.user_id = user_address
    ORDER BY
        u.followers DESC;
END;
$$ LANGUAGE plpgsql;