CREATE OR REPLACE FUNCTION get_coins(
    p_limit INTEGER,
    p_offset INTEGER,
    p_search_term TEXT DEFAULT NULL,
    p_sort_key TEXT DEFAULT 'created_timestamp',
    p_sort_direction TEXT DEFAULT 'DESC',
    p_include_nsfw BOOLEAN DEFAULT false,
    p_creator TEXT DEFAULT NULL
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
    nsfw boolean,
    market_id text,
    inverted boolean,
    username text,
    profile_image text
) AS $$
DECLARE
    query TEXT;
BEGIN
    query := 'SELECT
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
        c.nsfw,
        c.market_id,
        c.inverted,
        u.username,
        u.profile_image
    FROM
        coins c
    LEFT JOIN replies r ON c.mint = r.mint
    LEFT JOIN users2 u ON c.creator = u.address
    WHERE
        c.created_timestamp > 1705603528203
        AND (c.nsfw = FALSE OR (c.nsfw IS TRUE AND p_include_nsfw))
        AND (p_creator IS NULL OR c.creator = p_creator)
    GROUP BY c.mint, u.username, u.profile_image
    ORDER BY ' || CASE
        WHEN p_sort_key = 'created_timestamp' THEN 'c.created_timestamp '
        WHEN p_sort_key = 'last_trade_timestamp' THEN 'c.last_trade_timestamp '
        WHEN p_sort_key = 'market_cap' THEN 'c.market_cap '
        WHEN p_sort_key = 'reply_count' THEN 'reply_count '
        WHEN p_sort_key = 'last_reply' THEN 'last_reply '
    END || p_sort_direction || ' NULLS LAST
    LIMIT ' || p_limit || ' OFFSET ' || p_offset || ';';

    RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql;