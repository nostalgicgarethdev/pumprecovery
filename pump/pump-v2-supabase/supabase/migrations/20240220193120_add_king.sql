alter table coins add column king_of_the_hill_timestamp numeric;

DROP FUNCTION get_coins_with_creator_and_hidden();
CREATE OR REPLACE FUNCTION get_coins_with_creator_and_hidden()
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
  king_of_the_hill_timestamp numeric -- Added king_of_the_hill_timestamp column
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
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
    c.king_of_the_hill_timestamp -- Added king_of_the_hill_timestamp to the SELECT
  FROM 
    coins c
  LEFT JOIN (
    SELECT DISTINCT ON (address) *
    FROM messages
    ORDER BY address ASC
  ) m ON c.creator = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username;
END; $$ 
LANGUAGE 'plpgsql';