ALTER TABLE coins ADD COLUMN nsfw BOOLEAN DEFAULT false;
alter table replies add column hidden boolean default false; 

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
    nsfw boolean
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
    c.nsfw
  FROM 
    coins c
  LEFT JOIN replies r ON c.mint = r.mint
  WHERE 
    c.mint = p_mint -- Filter by the provided mint
  GROUP BY c.mint;
END; $$ 
LANGUAGE 'plpgsql';

DROP FUNCTION IF EXISTS get_coins;
CREATE OR REPLACE FUNCTION get_coins(
    p_limit INTEGER,
    p_offset INTEGER,
    p_search_term TEXT DEFAULT NULL,
    p_sort_key TEXT DEFAULT 'created_timestamp',
    p_sort_direction TEXT DEFAULT 'DESC',
    p_include_nsfw BOOLEAN DEFAULT false -- Add the p_include_nsfw parameter
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
    "hidden" boolean,
    total_supply numeric,
    website text,
    show_name boolean,
    last_trade_timestamp numeric,
    king_of_the_hill_timestamp numeric,
    market_cap numeric,
    reply_count bigint,
    last_reply bigint,
    nsfw boolean -- Add the nsfw field to the result
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
        c."hidden",
        c.total_supply,
        c.website,
        c.show_name,
        c.last_trade_timestamp,
        c.king_of_the_hill_timestamp,
        c.market_cap,
        COUNT(r.mint) AS reply_count,
        MAX(r.timestamp) AS last_reply,
        c.nsfw -- Include the nsfw field in the SELECT clause
    FROM 
        coins c
    LEFT JOIN replies r ON c.mint = r.mint
    WHERE 
        c.created_timestamp > 1705603528203
        AND c."hidden" IS NULL
        AND (c.nsfw = FALSE OR c.nsfw IS TRUE AND $2) -- Use the p_include_nsfw parameter to filter NSFW coins
        AND
        (($1 IS NULL OR $1 = '''') OR 
        (c."name" ILIKE ''%'' || $1::TEXT || ''%'' OR 
        c.symbol ILIKE ''%'' || $1::TEXT || ''%'' OR 
        c.mint ILIKE ''%'' || $1::TEXT || ''%''))
    GROUP BY c.mint
    ORDER BY ' 
    || CASE 
        WHEN p_sort_key = 'created_timestamp' THEN 'c.created_timestamp ' 
        WHEN p_sort_key = 'last_trade_timestamp' THEN 'c.last_trade_timestamp '
        WHEN p_sort_key = 'market_cap' THEN 'c.market_cap '
        WHEN p_sort_key = 'reply_count' THEN 'reply_count '
        WHEN p_sort_key = 'last_reply' THEN 'last_reply '
    END
    || p_sort_direction || ' NULLS LAST
    LIMIT ' || p_limit || ' OFFSET ' || p_offset
    USING p_search_term, p_include_nsfw; -- Pass the p_include_nsfw parameter to the USING clause
END; $$
LANGUAGE 'plpgsql';

DROP FUNCTION IF EXISTS get_king_of_the_hill_coin();
CREATE OR REPLACE FUNCTION get_king_of_the_hill_coin(
    p_include_nsfw BOOLEAN DEFAULT false -- Add the optional p_include_nsfw parameter
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
    reply_count bigint, -- Existing reply_count field
    nsfw boolean -- Add the nsfw field
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
    c.nsfw -- Include the nsfw field in the SELECT clause
  FROM coins c
  LEFT JOIN replies r ON c.mint = r.mint
  WHERE c.nsfw = FALSE OR (c.nsfw = TRUE AND p_include_nsfw) -- Conditionally filter based on nsfw and p_include_nsfw
  GROUP BY c.mint -- Group by coin mint to aggregate replies
  ORDER BY c.king_of_the_hill_timestamp DESC NULLS LAST
  LIMIT 1;
END; $$ 
LANGUAGE 'plpgsql';