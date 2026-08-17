CREATE OR REPLACE FUNCTION public.get_coins_bought_by_user()
 RETURNS TABLE(user_id text, coins_bought integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    trades."user" AS user_id, 
    COUNT(DISTINCT trades.mint)::INT AS coins_bought -- Cast to INT here
  FROM trades
  GROUP BY trades."user"
  ORDER BY coins_bought DESC;
END; $function$
