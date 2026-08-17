CREATE OR REPLACE FUNCTION get_user_balances(p_user text, p_offset INTEGER, p_limit INTEGER)
RETURNS TABLE (
    "user" TEXT,
    mint TEXT,
    balance NUMERIC,
    image_uri TEXT,
    symbol TEXT,
    name TEXT,
    market_cap NUMERIC,
    value NUMERIC
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        b."user",
        b.mint,
        b.balance,
        c.image_uri,
        c.symbol,
        c.name,
        c.market_cap,
        (c.market_cap * b.balance) AS value
    FROM 
        balances b
    INNER JOIN 
        coins c ON b.mint = c.mint
    WHERE 
        b."user" = p_user
    ORDER BY 
        (c.market_cap * b.balance) DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;