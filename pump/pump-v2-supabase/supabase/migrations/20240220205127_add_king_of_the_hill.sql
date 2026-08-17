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
    king_of_the_hill_timestamp numeric
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
    c.king_of_the_hill_timestamp
  FROM coins c
  LEFT JOIN (
    SELECT m1.*
    FROM messages m1
    LEFT JOIN messages m2 ON m1.address = m2.address AND m1.id < m2.id
    WHERE m2.id IS NULL
  ) m ON c.creator = m.address
  LEFT JOIN users u ON m.twitter_username = u.twitter_username
  ORDER BY c.king_of_the_hill_timestamp DESC
  LIMIT 1;
END; $$ 
LANGUAGE 'plpgsql';