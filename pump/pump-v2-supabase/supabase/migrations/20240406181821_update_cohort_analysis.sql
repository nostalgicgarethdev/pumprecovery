CREATE OR REPLACE FUNCTION public.get_cohort_analysis(
    p_limit integer DEFAULT 31,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(cohort_date_out date, days_since_cohort integer, cohort_size bigint, active_users bigint, retention_rate numeric)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH
    first_trades AS (
      SELECT
        "user",
        MIN(to_timestamp("timestamp")) AS first_trade_time
      FROM
        trades
      GROUP BY
        "user"
    ),
    first_trade_dates AS (
      SELECT
        ft."user",
        DATE(ft.first_trade_time) AS cohort_date
      FROM
        first_trades ft
    ),
    cohort_sizes AS (
      SELECT
        ftd.cohort_date AS cohort_date,
        COUNT(*) AS cohort_size
      FROM
        first_trade_dates ftd
      GROUP BY
        ftd.cohort_date
      ORDER BY
        ftd.cohort_date DESC
      LIMIT p_limit OFFSET p_offset
    ),
    trades_with_cohort AS (
      SELECT
        t."user",
        DATE(to_timestamp(t."timestamp")) AS trade_date,
        ftd.cohort_date AS cohort_date
      FROM
        trades t
        JOIN first_trade_dates ftd ON t."user" = ftd."user"
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
$$;

