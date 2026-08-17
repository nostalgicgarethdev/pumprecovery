CREATE OR REPLACE FUNCTION get_trades_with_user_details()
RETURNS TABLE (
  signature TEXT,
  mint TEXT,
  sol_amount NUMERIC,
  token_amount NUMERIC,
  is_buy BOOLEAN,
  "user" TEXT,
  "timestamp" NUMERIC,
  twitter_username TEXT,
  pfp TEXT
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
    u.twitter_username, 
    u.pfp
  FROM 
    trades t
  LEFT JOIN (
    SELECT DISTINCT ON (address) *
    FROM messages
    ORDER BY address ASC
  ) m ON t."user" = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username;
END; $$ 
LANGUAGE 'plpgsql';