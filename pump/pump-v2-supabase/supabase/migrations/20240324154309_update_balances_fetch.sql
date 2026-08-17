drop function get_user_balances(text, integer, integer);
CREATE OR REPLACE FUNCTION get_user_balances(p_address text, p_offset INTEGER, p_limit INTEGER)
RETURNS TABLE (
    address TEXT,
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
        b.address,
        b.mint,
        b.balance,
        c.image_uri,
        c.symbol,
        c.name,
        c.market_cap,
        (c.market_cap * b.balance / c.total_supply / 1000000) AS value
    FROM 
        balances b
    INNER JOIN 
        coins c ON b.mint = c.mint
    WHERE 
        b.address = p_address
    ORDER BY 
        (c.market_cap * b.balance) DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;