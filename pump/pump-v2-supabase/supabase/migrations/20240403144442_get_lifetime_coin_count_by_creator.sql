CREATE OR REPLACE FUNCTION public.get_lifetime_coin_count_by_creator()
 RETURNS TABLE(creator text, lifetime_coin_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    coins."creator", -- Explicitly specifying the table name might help if there's an alias or variable causing ambiguity.
    COUNT(*) AS lifetime_coin_count
  FROM coins
  GROUP BY coins."creator"; -- Again, specifying the table name for clarity.
END; $function$
