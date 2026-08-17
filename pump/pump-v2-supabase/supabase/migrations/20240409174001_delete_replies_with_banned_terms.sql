CREATE OR REPLACE FUNCTION delete_replies_with_banned_terms()
RETURNS void AS $$
DECLARE
    term TEXT;
BEGIN
    -- Loop through each banned term
    FOR term IN SELECT term FROM ban_terms LOOP
        -- Delete the last 500 replies containing the banned term
        WITH replies_to_delete AS (
            SELECT id
            FROM replies
            WHERE text LIKE '%' || term || '%'
            ORDER BY timestamp DESC
            LIMIT 500
        )
        DELETE FROM replies WHERE id IN (SELECT id FROM replies_to_delete);
    END LOOP;
END;
$$ LANGUAGE plpgsql;