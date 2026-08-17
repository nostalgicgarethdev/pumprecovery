CREATE OR REPLACE FUNCTION public.get_unique_daily_users(
    p_limit integer DEFAULT 31,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(day date, unique_users bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH first_trade_dates AS (
      SELECT
        "user",
        DATE(MIN(to_timestamp("timestamp"))) AS first_trade_day
      FROM
        trades
      GROUP BY
        "user"
  ),
  daily_first_trades AS (
      SELECT
        first_trade_day AS day,
        COUNT(*) AS unique_users
      FROM
        first_trade_dates
      GROUP BY
        first_trade_day
  )
  SELECT
    day,
    unique_users
  FROM
    daily_first_trades
  ORDER BY
    day DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
