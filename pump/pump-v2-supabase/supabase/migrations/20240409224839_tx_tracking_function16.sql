DROP MATERIALIZED VIEW IF EXISTS public.tx_stats_materialized;

CREATE MATERIALIZED VIEW public.tx_stats_materialized AS
SELECT
  submitted_slot::BIGINT AS starting_slot,
  AVG(confirmed_slot - submitted_slot) AS avg_slot_delta,
  COUNT(*) FILTER (WHERE confirmed_slot - submitted_slot > 0) / COUNT(*)::NUMERIC AS land_rate
FROM
  tx_tracking
WHERE
  confirmed_slot > submitted_slot
GROUP BY
  starting_slot
ORDER BY
  starting_slot DESC;
