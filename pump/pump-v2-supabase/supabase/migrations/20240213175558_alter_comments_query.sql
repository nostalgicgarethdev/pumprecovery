CREATE OR REPLACE FUNCTION get_comments_with_user_details(mintId TEXT)
RETURNS TABLE(
    is_confirmed BOOLEAN,
    content TEXT,
    "timestamp" NUMERIC,
    signature TEXT,
    user_address TEXT,
    is_buy BOOLEAN,
    sol_amount NUMERIC,
    mint_id TEXT,
    twitter_username TEXT,
    pfp TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.is_confirmed, 
        c.content, 
        c.timestamp, 
        c.signature, 
        c."user" as user_address, 
        c.is_buy, 
        c.sol_amount, 
        c.mint_id, 
        m.twitter_username,
        u.pfp
    FROM 
        comments c
    LEFT JOIN (
        SELECT m1.*
        FROM messages m1
        LEFT JOIN messages m2 ON m1.address = m2.address AND m1.id < m2.id
        WHERE m2.id IS NULL
    ) m ON c."user" = m.address
    LEFT JOIN users u ON m.twitter_username = u.twitter_username
    WHERE c.is_confirmed = TRUE AND c.mint_id = mintId;
END; $$ 
LANGUAGE plpgsql;