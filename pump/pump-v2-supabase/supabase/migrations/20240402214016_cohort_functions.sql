CREATE OR REPLACE FUNCTION public.get_cohort_analysis()
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
    trades_with_cohort AS (
      SELECT
        t."user",
        DATE(to_timestamp(t."timestamp")) AS trade_date,
        f.cohort_date
      FROM
        trades t
        JOIN first_trade_dates f ON t."user" = f."user"
    ),
    activity_after_cohort AS (
      SELECT
        twc.cohort_date,
        twc.trade_date,
        COUNT(DISTINCT twc."user") AS active_users
      FROM
        trades_with_cohort twc
      WHERE
        twc.trade_date >= twc.cohort_date
      GROUP BY
        twc.cohort_date,
        twc.trade_date
    ),
    cohort_sizes AS (
      SELECT
        ftd.cohort_date,
        COUNT(*) AS cohort_size
      FROM
        first_trade_dates ftd
      GROUP BY
        ftd.cohort_date
    )
  SELECT
    aac.cohort_date,
    (aac.trade_date - aac.cohort_date) AS days_since_cohort, -- Directly calculate days since cohort
    cs.cohort_size,
    aac.active_users,
    (aac.active_users * 100.0) / cs.cohort_size AS retention_rate
  FROM
    activity_after_cohort aac
    JOIN cohort_sizes cs ON aac.cohort_date = cs.cohort_date
  ORDER BY
    aac.cohort_date,
    (aac.trade_date - aac.cohort_date); -- Order by days since cohort
END;
$function$