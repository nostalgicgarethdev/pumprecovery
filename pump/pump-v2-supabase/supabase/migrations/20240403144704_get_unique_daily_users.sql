CREATE OR REPLACE FUNCTION public.get_unique_daily_users()
 RETURNS TABLE(day date, unique_users bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    DATE(TO_TIMESTAMP("timestamp" / 1000)) AS day, -- Convert milliseconds to seconds
    COUNT(DISTINCT "user") AS unique_users
  FROM
    visits
  GROUP BY
    day
  ORDER BY
    day DESC;
END; $function$
