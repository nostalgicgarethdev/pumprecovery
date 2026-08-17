CREATE OR REPLACE FUNCTION fetch_notifications_with_replies(
    p_user TEXT,
    p_limit INT,
    p_offset INT
)
RETURNS TABLE (
    notification_id INT,
    notification_user TEXT,
    notification_type notification_type,
    target_id TEXT,
    source_user TEXT,
    notification_message TEXT,
    notification_is_read BOOLEAN,
    notification_timestamp BIGINT,
    reply_id INT,
    reply_mint TEXT,
    reply_file_uri TEXT,
    reply_text TEXT,
    reply_user TEXT,
    reply_timestamp BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.notification_id,
        n."user",
        n.type,
        n.target_id,
        n.source_user,
        n.message,
        n.is_read,
        n.timestamp,
        r.id,
        r.mint,
        r.file_uri,
        r.text,
        r."user",
        r.timestamp
    FROM notifications n
    LEFT JOIN replies r ON n.target_id::INT = r.id
    WHERE n."user" = p_user
    ORDER BY n.timestamp DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;