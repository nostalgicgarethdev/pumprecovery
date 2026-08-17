ALTER TABLE coins
ADD COLUMN total_supply NUMERIC;

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
    total_supply numeric
) AS $$
BEGIN
  RETURN QUERY 
  SELECT c.mint, c.name, c.symbol, c."description", c.image_uri, c.metadata_uri, c.twitter, c.telegram, c.bonding_curve, c.associated_bonding_curve, c.creator, c.created_timestamp, c.raydium_pool, c.complete, m.twitter_username, u.pfp, c.virtual_sol_reserves, c.virtual_token_reserves, c.total_supply
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

DROP FUNCTION get_coins_with_creator_and_hidden();

create or replace function get_coins_with_creator_and_hidden()
returns table (
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
  total_supply numeric
) AS $$
begin
  return QUERY 
  select 
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
    c.total_supply
  from 
    coins c
  left join (
    select distinct on (address) *
    from messages
    order by address ASC
  ) m ON c.creator = m.address
  left join users u ON m.twitter_username = u.twitter_username;
end; $$ 
language 'plpgsql';