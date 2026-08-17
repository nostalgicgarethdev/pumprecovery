create or replace function get_coins_with_creator()
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
  pfp text
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
    u.pfp
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