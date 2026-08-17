alter table coins add column market_cap numeric default 0;

DROP FUNCTION IF EXISTS get_king_of_the_hill_coin();
CREATE OR REPLACE FUNCTION get_king_of_the_hill_coin()
RETURNS TABLE (
    mint text,
    name text,
    symbol text,
    "description" text,
    image_uri text,
    metadata_uri text,
    twitter text,
    telegram text,
    bonding_curve text,
    associated_bonding_curve text,
    creator text,
    created_timestamp numeric,
    raydium_pool text,
    complete boolean,
    twitter_username text,
    pfp text,
    virtual_sol_reserves numeric,
    virtual_token_reserves numeric,
    total_supply numeric,
    website text,
    show_name boolean,
    king_of_the_hill_timestamp numeric,
    market_cap numeric
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    c.mint, 
    c.name, 
    c.symbol, 
    c."description", 
    c.image_uri, 
    c.metadata_uri, 
    c.twitter, 
    c.telegram, 
    c.bonding_curve, 
    c.associated_bonding_curve, 
    c.creator, 
    c.created_timestamp, 
    c.raydium_pool, 
    c.complete, 
    m.twitter_username, 
    u.pfp, 
    c.virtual_sol_reserves, 
    c.virtual_token_reserves, 
    c.total_supply, 
    c.website, 
    c.show_name,
    c.king_of_the_hill_timestamp,
    c.market_cap
  FROM coins c
  LEFT JOIN (
    SELECT m1.*
    FROM messages m1
    LEFT JOIN messages m2 ON m1.address = m2.address AND m1.id < m2.id
    WHERE m2.id IS NULL
  ) m ON c.creator = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username
  ORDER BY c.king_of_the_hill_timestamp DESC NULLS LAST
  LIMIT 1;
END; $$ 
LANGUAGE 'plpgsql';

DROP FUNCTION IF EXISTS get_coins;
CREATE OR REPLACE FUNCTION get_coins(
    p_limit INTEGER,
    p_offset INTEGER,
    p_search_term TEXT DEFAULT NULL, -- Optional parameter for search term
    p_sort_key TEXT DEFAULT 'created_timestamp', -- Parameter for sorting key, allowing only 'created_timestamp' or 'last_trade_timestamp'
    p_sort_direction TEXT DEFAULT 'DESC' -- Parameter for sorting direction ('ASC' or 'DESC')
)
RETURNS TABLE (
  mint text,
  "name" text,
  symbol text,
  "description" text,
  image_uri text,
  metadata_uri text,
  twitter text,
  telegram text,
  bonding_curve text,
  associated_bonding_curve text,
  creator text,
  created_timestamp numeric,
  raydium_pool text,
  complete boolean,
  virtual_sol_reserves numeric,
  virtual_token_reserves numeric,
  twitter_username text,
  pfp text,
  "hidden" boolean,
  total_supply numeric,
  website text,
  show_name boolean,
  last_trade_timestamp numeric,
  king_of_the_hill_timestamp numeric,
  market_cap numeric -- Added market_cap to the returned columns
) AS $$
BEGIN
  RETURN QUERY EXECUTE
  'SELECT 
    c.mint,
    c."name",
    c.symbol,
    c."description",
    c.image_uri,
    c.metadata_uri,
    c.twitter,
    c.telegram,
    c.bonding_curve,
    c.associated_bonding_curve,
    c.creator,
    c.created_timestamp,
    c.raydium_pool,
    c.complete,
    c.virtual_sol_reserves,
    c.virtual_token_reserves,
    u.twitter_username,
    u.pfp,
    c."hidden",
    c.total_supply,
    c.website,
    c.show_name,
    c.last_trade_timestamp,
    c.king_of_the_hill_timestamp,
    c.market_cap
  FROM 
    coins c
  LEFT JOIN (
    SELECT DISTINCT ON (address) *
    FROM messages
    ORDER BY address ASC
  ) m ON c.creator = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username
  WHERE 
    c.created_timestamp > 1705603528203
    AND c."hidden" IS NULL
    AND
    (($1 IS NULL OR $1 = '''') OR 
    (c."name" ILIKE ''%'' || $1::TEXT || ''%'' OR 
     c.symbol ILIKE ''%'' || $1::TEXT || ''%'' OR 
     c.mint ILIKE ''%'' || $1::TEXT || ''%''))
  ORDER BY ' 
  || CASE 
       WHEN p_sort_key = 'created_timestamp' THEN 'c.created_timestamp ' 
       WHEN p_sort_key = 'last_trade_timestamp' THEN 'c.last_trade_timestamp ' 
       WHEN p_sort_key = 'market_cap' THEN 'c.market_cap '
     END
  || p_sort_direction || ' NULLS LAST
  LIMIT ' || p_limit || ' OFFSET ' || p_offset
  USING p_search_term;
END; $$
LANGUAGE 'plpgsql';

DROP FUNCTION get_coins_with_user_details();
CREATE OR REPLACE FUNCTION get_coins_with_user_details()
RETURNS TABLE (
    mint text,
    name text,
    symbol text,
    "description" text,
    image_uri text,
    metadata_uri text,
    twitter text,
    telegram text,
    bonding_curve text,
    associated_bonding_curve text,
    creator text,
    created_timestamp numeric,
    raydium_pool text,
    complete boolean,
    twitter_username text,
    pfp text,
    virtual_sol_reserves numeric,
    virtual_token_reserves numeric,
    total_supply numeric,
    website text,
    show_name boolean,
    king_of_the_hill_timestamp numeric,
    market_cap numeric
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    c.mint, 
    c.name, 
    c.symbol, 
    c."description", 
    c.image_uri, 
    c.metadata_uri, 
    c.twitter, 
    c.telegram, 
    c.bonding_curve, 
    c.associated_bonding_curve, 
    c.creator, 
    c.created_timestamp, 
    c.raydium_pool, 
    c.complete, 
    m.twitter_username, 
    u.pfp, 
    c.virtual_sol_reserves, 
    c.virtual_token_reserves, 
    c.total_supply, 
    c.website, 
    c.show_name,
    c.king_of_the_hill_timestamp,
    c.market_cap
  FROM coins c
  LEFT JOIN (
    SELECT m1.*
    FROM messages m1
    LEFT JOIN messages m2 ON m1.address = m2.address AND m1.id < m2.id
    WHERE m2.id IS NULL
  ) m ON c.creator = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username;
END; $$ 
LANGUAGE 'plpgsql';


DROP FUNCTION get_coins_with_user_details();
CREATE OR REPLACE FUNCTION get_coins_with_user_details()
RETURNS TABLE (
    mint text,
    name text,
    symbol text,
    "description" text,
    image_uri text,
    metadata_uri text,
    twitter text,
    telegram text,
    bonding_curve text,
    associated_bonding_curve text,
    creator text,
    created_timestamp numeric,
    raydium_pool text,
    complete boolean,
    twitter_username text,
    pfp text,
    virtual_sol_reserves numeric,
    virtual_token_reserves numeric,
    total_supply numeric,
    website text,
    show_name boolean,
    king_of_the_hill_timestamp numeric,
    market_cap numeric
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    c.mint, 
    c.name, 
    c.symbol, 
    c."description", 
    c.image_uri, 
    c.metadata_uri, 
    c.twitter, 
    c.telegram, 
    c.bonding_curve, 
    c.associated_bonding_curve, 
    c.creator, 
    c.created_timestamp, 
    c.raydium_pool, 
    c.complete, 
    m.twitter_username, 
    u.pfp, 
    c.virtual_sol_reserves, 
    c.virtual_token_reserves, 
    c.total_supply, 
    c.website, 
    c.show_name,
    c.king_of_the_hill_timestamp,
    c.market_cap
  FROM coins c
  LEFT JOIN (
    SELECT m1.*
    FROM messages m1
    LEFT JOIN messages m2 ON m1.address = m2.address AND m1.id < m2.id
    WHERE m2.id IS NULL
  ) m ON c.creator = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username;
END; $$ 
LANGUAGE 'plpgsql';
