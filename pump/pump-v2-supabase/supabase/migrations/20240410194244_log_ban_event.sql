CREATE OR REPLACE FUNCTION log_ban_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO moderator_logs (address, item, item_type, item_ID, action)
        SELECT
            NEW.by_admin AS address,
            'user' AS item,
            'user wallet' AS item_type,
            r.user AS item_ID,
            'ban' AS action
        FROM
            bans b
        JOIN
            replies r ON b.origin = r.id
        WHERE
            b.origin = NEW.origin;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;