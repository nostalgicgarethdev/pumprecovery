CREATE MATERIALIZED VIEW public.tx_stats_materialized AS
WITH slot_deltas AS (
    SELECT
      submitted_slot::BIGINT, -- Cast submitted_slot to BIGINT
      confirmed_slot - submitted_slot AS slot_delta -- Calculate the delta between confirmed and submitted slots
    FROM
      tx_tracking
    WHERE
      confirmed_slot > submitted_slot -- Only consider transactions that were confirmed after submission
),
aggregated_stats AS (
    SELECT
      sd.submitted_slot AS starting_slot, -- Now explicitly a BIGINT
      AVG(sd.slot_delta) AS avg_slot_delta, -- Calculate the average slot delta
      COUNT(*) FILTER (WHERE sd.slot_delta > 0) / COUNT(*)::NUMERIC AS land_rate -- Calculate the land rate
    FROM
      slot_deltas sd -- Use an alias for the subquery to avoid ambiguity
    GROUP BY
      sd.submitted_slot
)
SELECT
  asl.starting_slot, -- Disambiguate by using the alias
  asl.avg_slot_delta, -- Disambiguate by using the alias
  asl.land_rate -- Disambiguate by using the alias
FROM
  aggregated_stats asl -- Assign an alias to the aggregated_stats CTE
ORDER BY
  asl.starting_slot DESC;
