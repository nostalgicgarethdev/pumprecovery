drop function get_trades;
CREATE OR REPLACE FUNCTION get_trades(
  p_input_mint TEXT, 
  p_limit INT, -- Parameter for LIMIT, will always be provided
  p_offset INT -- Parameter for OFFSET, will always be provided
)
RETURNS TABLE (
  signature TEXT,
  mint TEXT,
  sol_amount NUMERIC,
  token_amount NUMERIC,
  is_buy BOOLEAN,
  "user" TEXT,
  "timestamp" NUMERIC,
  username TEXT,
  profile_image TEXT
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
    u.username, 
    u.profile_image
  FROM 
    trades t
    LEFT JOIN users2 u ON t."user" = u.address
  WHERE t.mint = p_input_mint
  ORDER BY t."timestamp" DESC -- Order by timestamp in descending order
  LIMIT p_limit -- Use the provided limit
  OFFSET p_offset; -- Use the provided offset
END; $$ 
LANGUAGE 'plpgsql';