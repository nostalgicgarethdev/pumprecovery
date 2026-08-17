drop function get_unique_daily_users(integer, integer);
CREATE OR REPLACE FUNCTION public.get_unique_daily_users(
    p_limit integer DEFAULT 31,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(trade_day date, daily_active_users bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH first_trade_dates AS (
      SELECT
        "user",
        DATE(MIN(to_timestamp("timestamp"))) AS first_trade_date
      FROM
        trades
      GROUP BY
        "user"
  ),
  daily_activity AS (
      SELECT
        DATE(to_timestamp("timestamp")) AS activity_date,
        COUNT(DISTINCT "user") AS unique_users
      FROM
        trades
      GROUP BY
        activity_date
  )
  SELECT
    da.activity_date AS trade_day,
    da.unique_users AS daily_active_users
  FROM
    daily_activity da
  ORDER BY
    da.activity_date DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;