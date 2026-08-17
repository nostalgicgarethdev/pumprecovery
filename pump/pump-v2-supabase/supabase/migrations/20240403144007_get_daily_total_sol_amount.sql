CREATE OR REPLACE FUNCTION public.get_daily_total_sol_amount()
 RETURNS TABLE(trade_date date, daily_total_sol_amount numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT DATE(to_timestamp(timestamp)) AS trade_date, 
         (SUM(sol_amount) / (10 ^ 9))::NUMERIC AS daily_total_sol_amount
  FROM trades
  GROUP BY trade_date
  ORDER BY trade_date;
END; $function$
