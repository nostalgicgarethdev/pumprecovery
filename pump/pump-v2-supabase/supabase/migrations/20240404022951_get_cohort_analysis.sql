CREATE OR REPLACE FUNCTION public.get_cohort_analysis(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(cohort_date_out date, days_since_cohort integer, cohort_size bigint, active_users bigint, retention_rate numeric)
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
        first_trade_dates.cohort_date AS cohort_date,
        COUNT(*) AS cohort_size
      FROM
        first_trade_dates
      GROUP BY
        first_trade_dates.cohort_date
      ORDER BY
        first_trade_dates.cohort_date DESC
      LIMIT p_limit OFFSET p_offset
    ),
    trades_with_cohort AS (
      SELECT
        t."user",
        DATE(to_timestamp(t."timestamp")) AS trade_date,
        f.cohort_date AS cohort_date
      FROM
        trades t
        JOIN first_trade_dates f ON t."user" = f."user"
    ),
    activity_after_cohort AS (
      SELECT
        twc.cohort_date AS cohort_date,
        twc.trade_date,
        COUNT(DISTINCT twc."user") AS active_users
      FROM
        trades_with_cohort twc
      WHERE
        twc.trade_date >= twc.cohort_date
      GROUP BY
        twc.cohort_date,
        twc.trade_date
    )
  SELECT
    cs.cohort_date AS cohort_date_out,
    (aac.trade_date - cs.cohort_date) AS days_since_cohort,
    cs.cohort_size,
    COALESCE(aac.active_users, 0) AS active_users,
    CASE WHEN cs.cohort_size > 0 THEN (COALESCE(aac.active_users, 0) * 100.0) / cs.cohort_size ELSE 0 END AS retention_rate
  FROM
    cohort_sizes cs
    LEFT JOIN activity_after_cohort aac ON cs.cohort_date = aac.cohort_date
  ORDER BY
    cs.cohort_date DESC,
    (aac.trade_date - cs.cohort_date);
END;
$function$
