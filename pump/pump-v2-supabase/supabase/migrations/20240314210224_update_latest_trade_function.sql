CREATE OR REPLACE FUNCTION get_latest_trade()
RETURNS TABLE (
  signature TEXT,
  mint TEXT,
  sol_amount NUMERIC,
  token_amount NUMERIC,
  is_buy BOOLEAN,
  "user" TEXT,
  "timestamp" NUMERIC,
  twitter_username TEXT,
  pfp TEXT,
  symbol text,
  image_uri text
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
    u.pfp,
    c.symbol,
    c.image_uri
  FROM 
    trades t
  LEFT JOIN (
    SELECT DISTINCT ON (address) *
    FROM messages
    ORDER BY address ASC
  ) m ON t."user" = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username
  LEFT JOIN (
    SELECT DISTINCT ON (mint) *
    FROM coins
    ORDER BY mint ASC -- This might not be necessary for your purpose but ensures consistency in selection
  ) c ON t.mint = c.mint
  ORDER BY t."timestamp" DESC -- Order by timestamp to get the latest
  LIMIT 1; -- Limit to only the latest trade
END; $$ 
LANGUAGE 'plpgsql';