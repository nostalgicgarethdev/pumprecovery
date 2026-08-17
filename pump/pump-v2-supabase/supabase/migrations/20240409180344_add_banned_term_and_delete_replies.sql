CREATE OR REPLACE FUNCTION add_banned_term_and_delete_replies(target_term TEXT)
RETURNS void AS $$
BEGIN
    -- Attempt to insert the banned term into the ban_terms table.
    -- This assumes that your ban_terms table has a column named 'term'
    -- and that it's designed to handle duplicates appropriately,
    -- either through a unique constraint with an ON CONFLICT clause,
    -- or by other means of ensuring idempotence.
    INSERT INTO ban_terms (term)
    VALUES (target_term)
    ON CONFLICT (term) DO NOTHING; -- This handles the case where the term is already banned.
    
    -- Delete the last 500 replies containing the specific banned term.
    -- Assumes 'text' contains the reply content and 'timestamp' is used
    -- to determine the order in which replies were posted.
    WITH replies_to_delete AS (
        SELECT id
        FROM replies
        WHERE text LIKE '%' || target_term || '%'
        ORDER BY timestamp DESC
        LIMIT 500
    )
    DELETE FROM replies WHERE id IN (SELECT id FROM replies_to_delete);
END;
$$ LANGUAGE plpgsql;
