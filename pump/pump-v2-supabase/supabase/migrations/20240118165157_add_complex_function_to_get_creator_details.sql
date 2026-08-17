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
    pfp text
) AS $$
BEGIN
  RETURN QUERY 
  SELECT c.mint, c.name, c.symbol, c."description", c.image_uri, c.metadata_uri, c.twitter, c.telegram, c.bonding_curve, c.associated_bonding_curve, c.creator, c.created_timestamp, c.raydium_pool, c.complete, m.twitter_username, u.pfp
  FROM coins c
  LEFT JOIN messages m ON c.creator = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username;
END; $$ 
LANGUAGE 'plpgsql';
