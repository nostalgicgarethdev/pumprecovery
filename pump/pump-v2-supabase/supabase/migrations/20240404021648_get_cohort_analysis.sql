CREATE OR REPLACE FUNCTION public.get_cohort_analysis(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(cohort_date date, days_since_cohort integer, cohort_size bigint, active_users bigint, retention_rate numeric)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH
    first_trade_dates AS (
      SELECT
        "user",
        DATE(MIN(to_timestamp("timestamp"))) AS cohort_date
      FROM
        trades
      GROUP BY
        "user"
    ),
    cohort_sizes AS (
      SELECT
        cohort_date,
        COUNT(*) AS cohort_size
      FROM
        first_trade_dates
      GROUP BY
        cohort_date
      ORDER BY
        cohort_date DESC
      LIMIT p_limit OFFSET p_offset
    ),
    trades_with_cohort AS (
      SELECT
        t."user",
        DATE(to_timestamp(t."timestamp")) AS trade_date,
        f.cohort_date AS first_trade_cohort_date
      FROM
        trades t
        INNER JOIN first_trade_dates f ON t."user" = f."user"
    ),
    activity_after_cohort AS (
      SELECT
        twc.first_trade_cohort_date AS cohort_date,
        twc.trade_date,
        COUNT(DISTINCT twc."user") AS active_users
      FROM
        trades_with_cohort twc
      WHERE
        twc.trade_date >= twc.first_trade_cohort_date
      GROUP BY
        twc.first_trade_cohort_date,
        twc.trade_date
    )
  SELECT
    cs.cohort_date,
    (aac.trade_date - cs.cohort_date) AS days_since_cohort,
    cs.cohort_size,
    aac.active_users,
    (aac.active_users * 100.0) / cs.cohort_size AS retention_rate
  FROM
    activity_after_cohort aac
    RIGHT JOIN cohort_sizes cs ON aac.cohort_date = cs.cohort_date
  ORDER BY
    cs.cohort_date DESC,
    (aac.trade_date - cs.cohort_date);
END;
$function$