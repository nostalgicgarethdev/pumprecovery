CREATE OR REPLACE FUNCTION fetch_replies_for_mint(p_mint text)
RETURNS TABLE (
    id bigint,
    mint text,
    file_uri text,
    text text,
    "user" text,
    "timestamp" bigint,
    total_likes numeric,
    username text,
    profile_image text
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
        u.profile_image
    FROM
        replies r
        LEFT JOIN users2 u ON r."user" = u.address
    WHERE
        r.mint = p_mint
        AND r.hidden = FALSE
    ORDER BY
        r.timestamp DESC;
END;
$$;