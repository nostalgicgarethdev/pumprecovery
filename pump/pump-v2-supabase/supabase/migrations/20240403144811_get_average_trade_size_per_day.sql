CREATE OR REPLACE FUNCTION public.get_average_trade_size_per_day()
 RETURNS TABLE(trade_date date, average_trade_size numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Ensure the timestamp is correctly converted from milliseconds to seconds before converting to date
    TO_DATE(TO_CHAR(TO_TIMESTAMP(timestamp), 'YYYY-MM-DD'), 'YYYY-MM-DD') AS trade_date,
    AVG(sol_amount / (10 ^ 9))::NUMERIC AS average_trade_size
  FROM
    trades
  GROUP BY
    trade_date
  ORDER BY
    trade_date;
END;
$function$
