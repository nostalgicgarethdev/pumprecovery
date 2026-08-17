
DROP FUNCTION IF EXISTS get_king_of_the_hill_coin(BOOLEAN);
CREATE OR REPLACE FUNCTION get_king_of_the_hill_coin(
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
    COUNT(r.mint) AS reply_count,
    c.nsfw,
    c.market_id,
    c.inverted,
    u.username,
    u.profile_image
  FROM coins c
    LEFT JOIN replies r ON c.mint = r.mint
    LEFT JOIN users2 u ON c."creator" = u.address
  WHERE c.nsfw = FALSE OR (c.nsfw = TRUE AND p_include_nsfw) -- Conditionally filter based on nsfw and p_include_nsfw
  GROUP BY c.mint, u.username, u.profile_image
  ORDER BY c.king_of_the_hill_timestamp DESC NULLS LAST
  LIMIT 1;
END; $$ 
LANGUAGE 'plpgsql';


DROP FUNCTION IF EXISTS get_coin(TEXT);
CREATE OR REPLACE FUNCTION get_coin(
    p_mint TEXT
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
    last_reply bigint,
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
    COUNT(r.mint) AS reply_count,
    MAX(r.timestamp) AS last_reply,
    c.nsfw,
    c.market_id,
    c.inverted,
    u.username,
    u.profile_image
  FROM 
    coins c
  LEFT JOIN replies r ON c.mint = r.mint
  LEFT JOIN users2 u ON c."creator" = u.address
  WHERE 
    c.mint = p_mint
  GROUP BY c.mint, u.username, u.profile_image;
END; $$ 
LANGUAGE 'plpgsql';


DROP FUNCTION IF EXISTS get_coin(TEXT);
CREATE OR REPLACE FUNCTION get_coin(
    p_mint TEXT
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
    last_reply bigint,
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
    COUNT(r.mint) AS reply_count,
    MAX(r.timestamp) AS last_reply,
    c.nsfw,
    c.market_id,
    c.inverted,
    u.username,
    u.profile_image
  FROM 
    coins c
  LEFT JOIN replies r ON c.mint = r.mint
  LEFT JOIN users2 u ON c."creator" = u.address
  WHERE 
    c.mint = p_mint
  GROUP BY c.mint, u.username, u.profile_image;
END; $$ 
LANGUAGE 'plpgsql';