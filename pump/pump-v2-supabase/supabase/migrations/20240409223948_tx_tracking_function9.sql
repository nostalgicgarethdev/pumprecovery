DROP MATERIALIZED VIEW IF EXISTS public.tx_stats_materialized;

CREATE MATERIALIZED VIEW public.tx_stats_materialized AS
WITH slot_deltas AS (
    SELECT
      tx_tracking.submitted_slot::BIGINT AS submitted_slot, -- Fully qualify and cast submitted_slot to BIGINT
      tx_tracking.confirmed_slot - tx_tracking.submitted_slot AS slot_delta -- Calculate and fully qualify slot_delta
    FROM
      tx_tracking
    WHERE
      tx_tracking.confirmed_slot > tx_tracking.submitted_slot -- Fully qualify condition
),
aggregated_stats AS (
    SELECT
      slot_deltas.submitted_slot AS submitted_slot, -- Fully qualify submitted_slot from slot_deltas
      AVG(slot_deltas.slot_delta) AS avg_slot_delta, -- Calculate and fully qualify avg_slot_delta
      COUNT(*) FILTER (WHERE slot_deltas.slot_delta > 0) / COUNT(*)::NUMERIC AS land_rate -- Calculate and fully qualify land rate
    FROM
      slot_deltas
    GROUP BY
      slot_deltas.submitted_slot -- Fully qualify group by clause
)
SELECT
  aggregated_stats.submitted_slot, -- Fully qualify submitted_slot from aggregated_stats
  aggregated_stats.avg_slot_delta, -- Fully qualify avg_slot_delta
  aggregated_stats.land_rate -- Fully qualify land rate
FROM
  aggregated_stats
ORDER BY
  aggregated_stats.submitted_slot DESC;
