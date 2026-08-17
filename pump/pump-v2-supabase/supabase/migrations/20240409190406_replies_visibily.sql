CREATE OR REPLACE FUNCTION update_replies_visibility()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new banned term is added
    IF (TG_OP = 'INSERT') THEN
        -- Hide the last 500 replies containing the newly added banned term
        WITH cte AS (
            SELECT id FROM replies
            WHERE text LIKE '%' || NEW.term || '%'
            ORDER BY timestamp DESC
            LIMIT 500
        )
        UPDATE replies SET hidden = TRUE
        WHERE id IN (SELECT id FROM cte);
    -- Handling deletions is more complex due to potential overlaps with other banned terms
    -- Additional logic would be needed to safely unhide replies
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
