DROP FUNCTION IF EXISTS get_king_of_the_hill_coin_new(BOOLEAN);
CREATE OR REPLACE FUNCTION get_king_of_the_hill_coin_new(
    p_include_nsfw BOOLEAN DEFAULT false
)
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
    virtual_sol_reserves numeric,
    virtual_token_reserves numeric,
    total_supply numeric,
    website text,
    show_name boolean,
    king_of_the_hill_timestamp numeric,
    market_cap numeric,
    reply_count bigint,
    nsfw boolean,
    market_id text,
    inverted boolean,
    username text,
    profile_image text
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
    c.virtual_sol_reserves, 
    c.virtual_token_reserves, 
    c.total_supply, 
    c.website, 
    c.show_name,
    c.king_of_the_hill_timestamp,
    c.market_cap,
    reply_agg.reply_count as reply_count,
    c.nsfw,
    c.market_id,
    c.inverted,
    user2.username as username,
    user2.profile_image as profile_image
  FROM coins c
    LEFT JOIN (
        SELECT r.mint, COUNT(*) AS reply_count
        FROM replies r
        GROUP BY r.mint
    ) reply_agg ON c.mint = reply_agg.mint
    LEFT JOIN (
        SELECT u.username, u.profile_image, u.address
        FROM users2 u
        GROUP BY u.username, u.profile_image, u.address
    ) user2 ON c.creator = user2.address
  WHERE c.nsfw = FALSE OR (c.nsfw = TRUE AND p_include_nsfw)
  ORDER BY c.king_of_the_hill_timestamp DESC NULLS LAST
  LIMIT 1;
END; $$ 
LANGUAGE 'plpgsql';