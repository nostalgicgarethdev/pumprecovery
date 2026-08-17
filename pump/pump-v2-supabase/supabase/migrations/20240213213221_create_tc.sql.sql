CREATE TABLE trading_competition (
    "user" TEXT UNIQUE PRIMARY KEY,
    volume NUMERIC,
    pnl NUMERIC,
    daily_pnl NUMERIC
);

create table transfers (
    "signature" text primary key,
    mint text references coins(mint),
    sol_amount numeric,
    token_amount numeric,
    "user" text,
    timestamp numeric,
    is_buy boolean default false
);

CREATE OR REPLACE FUNCTION get_combined_trades_and_transfers(start_timestamp numeric, end_timestamp numeric)
RETURNS TABLE(
    mint text,
    sol_amount numeric,
    token_amount numeric,
    "user" text,
    "timestamp" numeric,
    is_buy boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.mint, 
        t.sol_amount, 
        t.token_amount, 
        t."user", 
        t."timestamp", 
        t.is_buy
    FROM (
        SELECT 
            tr.mint, 
            tr.sol_amount, 
            tr.token_amount, 
            tr."user", 
            tr."timestamp", 
            tr.is_buy
        FROM trades tr
        WHERE tr."timestamp" >= start_timestamp AND tr."timestamp" <= end_timestamp
        UNION ALL
        SELECT 
            trans.mint, 
            trans.sol_amount, 
            trans.token_amount, 
            trans."user", 
            trans."timestamp", 
            trans.is_buy
        FROM transfers trans
        WHERE trans."timestamp" >= start_timestamp AND trans."timestamp" <= end_timestamp
    ) AS t
    ORDER BY t."timestamp" ASC;
END; $$
LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_trading_competition_with_user_details()
RETURNS TABLE (
  "user" TEXT,
  volume NUMERIC,
  pnl NUMERIC,
  daily_pnl NUMERIC,
  twitter_username TEXT,
  pfp TEXT
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    tc."user", 
    tc.volume, 
    tc.pnl, 
    tc.daily_pnl,
    m.twitter_username, 
    u.pfp
  FROM 
    trading_competition tc
  LEFT JOIN (
    SELECT DISTINCT ON (address) *
    FROM messages
    ORDER BY address ASC
  ) m ON tc."user" = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username;
END; $$ 
LANGUAGE 'plpgsql';