CREATE OR REPLACE FUNCTION public.get_trade_and_coin_counts_with_ratio()
 RETURNS TABLE(date date, trade_count integer, coin_count integer, trade_coin_ratio double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH trade_counts AS (
    SELECT DATE(to_timestamp(timestamp)) AS trade_date, COUNT(*)::INT AS trade_count
    FROM trades
    GROUP BY trade_date
  ),
  coin_counts AS (
    SELECT DATE(to_timestamp(created_timestamp / 1000)) AS coin_date, COUNT(*)::INT AS coin_count
    FROM coins
    GROUP BY coin_date
  )
  SELECT 
    COALESCE(tc.trade_date, cc.coin_date) AS date, 
    COALESCE(tc.trade_count, 0) AS trade_count, 
    COALESCE(cc.coin_count, 0) AS coin_count,
    CASE 
      WHEN COALESCE(cc.coin_count, 0) > 0 THEN COALESCE(tc.trade_count, 0)::FLOAT / COALESCE(cc.coin_count, 0)
      ELSE NULL 
    END AS trade_coin_ratio
  FROM trade_counts tc
  FULL OUTER JOIN coin_counts cc ON tc.trade_date = cc.coin_date
  ORDER BY date;
END; $function$
