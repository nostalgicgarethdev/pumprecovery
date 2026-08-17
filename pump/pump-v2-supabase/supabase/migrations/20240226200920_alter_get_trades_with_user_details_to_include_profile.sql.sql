DROP FUNCTION IF EXISTS get_trades_with_user_details();

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
  pfp TEXT,
  "value" TEXT,
  score NUMERIC
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
    CASE
      WHEN COALESCE(p.score_sum, 0) < 2 THEN 'who_are_you'
      WHEN p.score_sum >= 2 AND p.score_sum < 5 THEN 'ten_cent_whale'
      WHEN p.score_sum >= 5 AND p.score_sum < 20 THEN 'accumulator'
      WHEN p.score_sum >= 20 AND p.score_sum < 50 THEN 'chart_shark'
      ELSE 'baron_von_pump'
    END AS "value",
    p.score_sum AS score
  FROM 
    trades t
  LEFT JOIN (
    SELECT DISTINCT ON (address) *
    FROM messages
    ORDER BY address ASC
  ) m ON t."user" = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username
  LEFT JOIN (
    SELECT 
      user, 
      (sold_30_min_score + sold_1_hr_score + amount_tokens_held_score + amount_tokens_bought_score) AS score_sum
    FROM profiles -- Assuming this table exists and contains the necessary score columns
  ) p ON t."user" = p.user;
END; $$ 
LANGUAGE 'plpgsql';