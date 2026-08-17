DROP FUNCTION IF EXISTS public.get_tx_stats(
    p_limit integer ,
    p_offset integer  
);
CREATE OR REPLACE FUNCTION public.get_tx_stats(
    p_limit integer DEFAULT 30,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    starting_slot BIGINT,
    avg_slot_delta NUMERIC,
    land_rate NUMERIC,
    estimated_timestamp TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT
    tsm.starting_slot AS starting_slot,
    tsm.avg_slot_delta AS avg_slot_delta,
    tsm.land_rate AS land_rate,
    tsm.earliest_timestamp AS estimated_timestamp
  FROM
    public.tx_stats_materialized tsm -- Alias the materialized view for clarity
  ORDER BY
    tsm.starting_slot DESC -- Use the alias in the ORDER BY clause
  LIMIT p_limit OFFSET p_offset;
END;
$$;
