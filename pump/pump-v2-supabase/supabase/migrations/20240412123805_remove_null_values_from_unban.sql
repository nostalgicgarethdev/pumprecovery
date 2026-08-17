CREATE OR REPLACE FUNCTION ban_address(p_address TEXT, p_expires NUMERIC)
RETURNS VOID AS $$
BEGIN
    INSERT INTO bans (origin, expires)
    SELECT DISTINCT origin, p_expires
    FROM replies
    WHERE "user" = p_address AND origin IS NOT NULL
    ON CONFLICT (origin) DO UPDATE
    SET expires = EXCLUDED.expires;
END;
$$ LANGUAGE plpgsql;