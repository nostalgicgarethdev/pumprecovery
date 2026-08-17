CREATE OR REPLACE FUNCTION get_replies_with_ban_status(p_limit INT, p_offset INT)
RETURNS TABLE(
    id INT,
    mint TEXT,
    file_uri TEXT,
    text TEXT,
    "user" TEXT,
    "timestamp" BIGINT,
    is_banned BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id,
           r.mint,
           r.file_uri,
           r.text,
           r."user",
           r."timestamp",
           CASE
               WHEN b.expires IS NOT NULL AND b.expires > EXTRACT(EPOCH FROM NOW()) * 1000 THEN TRUE
               ELSE FALSE
           END AS is_banned
    FROM replies AS r
    LEFT JOIN bans AS b ON r.origin = b.origin
    ORDER BY r.timestamp DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;