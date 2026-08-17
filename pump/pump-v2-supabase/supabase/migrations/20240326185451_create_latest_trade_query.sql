CREATE OR REPLACE FUNCTION get_latest_trade()
RETURNS TABLE(
  signature TEXT,
  mint TEXT,
  sol_amount NUMERIC,
  token_amount NUMERIC,
  is_buy BOOLEAN,
  "user" TEXT,
  "timestamp" numeric,
  symbol TEXT,
  image_uri TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.signature, 
    t.mint, 
    t.sol_amount, 
    t.token_amount, 
    t.is_buy, 
    t."user", 
    t."timestamp", 
    c.symbol,
    c.image_uri
  FROM 
    trades t
  JOIN 
    coins c ON t.mint = c.mint
  ORDER BY 
    t."timestamp" DESC
  LIMIT 1;
END; $$
LANGUAGE plpgsql;