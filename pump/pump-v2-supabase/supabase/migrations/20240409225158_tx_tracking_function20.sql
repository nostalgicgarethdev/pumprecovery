DROP MATERIALIZED VIEW IF EXISTS public.tx_stats_materialized;

CREATE MATERIALIZED VIEW public.tx_stats_materialized AS

WITH calculated_deltas AS (
  SELECT
    tx_tracking.submitted_slot::BIGINT AS starting_slot, -- Cast and rename submitted_slot to starting_slot for clarity
    tx_tracking.confirmed_slot - tx_tracking.submitted_slot AS slot_delta -- Calculate the difference and name it slot_delta for use in the outer query
  FROM
    tx_tracking
  WHERE
    tx_tracking.confirmed_slot > tx_tracking.submitted_slot -- Ensure we only consider cases where the confirmed_slot is greater than the submitted_slot
)

SELECT
  calculated_deltas.starting_slot, -- Directly use starting_slot from the CTE without casting
  AVG(calculated_deltas.slot_delta) AS avg_slot_delta, -- Use the calculated slot_delta from the CTE
  COUNT(*) FILTER (WHERE calculated_deltas.slot_delta > 0) / COUNT(*)::NUMERIC AS land_rate -- Use the slot_delta in the FILTER to calculate land_rate
FROM
  calculated_deltas
GROUP BY
  calculated_deltas.starting_slot;