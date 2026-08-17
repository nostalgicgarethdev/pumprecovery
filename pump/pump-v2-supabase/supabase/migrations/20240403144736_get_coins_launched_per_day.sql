CREATE OR REPLACE FUNCTION public.get_coins_launched_per_day()
 RETURNS TABLE(launch_date date, coins_launched bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    TO_DATE(TO_CHAR(TO_TIMESTAMP(created_timestamp / 1000), 'YYYY-MM-DD'), 'YYYY-MM-DD') AS launch_date,
    COUNT(*) AS coins_launched
  FROM
    coins
  GROUP BY
    launch_date
  ORDER BY
    launch_date;
END;
$function$