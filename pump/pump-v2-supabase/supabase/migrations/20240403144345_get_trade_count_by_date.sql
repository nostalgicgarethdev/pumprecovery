CREATE OR REPLACE FUNCTION public.get_trade_count_by_date()
 RETURNS TABLE(trade_date date, trade_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT DATE(to_timestamp(timestamp)) AS trade_date, COUNT(*) AS trade_count
  FROM trades
  GROUP BY trade_date
  ORDER BY trade_date;
END; $function$
