drop function if exists get_replies_for_mint;
CREATE OR REPLACE FUNCTION get_replies_for_mint(p_mint text, p_user text)
RETURNS TABLE (
    id int,
    mint text,
    file_uri text,
    text text,
    "user" text,
    "timestamp" bigint,
    total_likes numeric,
    username text,
    profile_image text,
    liked_by_user boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.mint,
        r.file_uri,
        r.text,
        r."user",
        r.timestamp,
        r.total_likes,
        u.username,
        u.profile_image,
        CASE
            WHEN l."user" IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS liked_by_user
    FROM
        replies r
        LEFT JOIN users2 u ON r."user" = u.address
        left join likes l on l.target_id::integer = r.id and l."user"=p_user
    WHERE
        r.mint = p_mint
        AND r.hidden = FALSE
    ORDER BY
        r.id ASC;
END;
$$;