DROP MATERIALIZED VIEW IF EXISTS public.tx_stats_materialized;

CREATE MATERIALIZED VIEW public.tx_stats_materialized AS

WITH calculated_deltas AS (
  SELECT
    tx_tracking.submitted_slot::BIGINT AS starting_slot, -- Cast submitted_slot to BIGINT for clarity
    tx_tracking.confirmed_slot::BIGINT - tx_tracking.submitted_slot::BIGINT AS slot_delta, -- Calculate slot delta
    tx_tracking.timestamp AS starting_timestamp -- Directly use the timestamp from tx_tracking
  FROM
    tx_tracking
  WHERE
    tx_tracking.confirmed_slot > tx_tracking.submitted_slot -- Consider only transactions with a confirmed_slot greater than submitted_slot
)

SELECT
  starting_slot,
  AVG(slot_delta) AS avg_slot_delta, -- Calculate the average slot delta
  COUNT(*) FILTER (WHERE slot_delta > 0) / COUNT(*)::NUMERIC AS land_rate, -- Calculate the land rate
  MIN(starting_timestamp) AS earliest_timestamp -- Get the earliest timestamp for each starting slot
FROM
  calculated_deltas
GROUP BY
  starting_slot;
