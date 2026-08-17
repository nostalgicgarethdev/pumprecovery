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
    tsr.starting_slot AS starting_slot,
    tsr.avg_slot_delta AS avg_slot_delta,
    tsr.land_rate AS land_rate,
    tsr.estimated_timestamp::TIMESTAMP WITHOUT TIME ZONE AS estimated_timestamp -- Cast to TIMESTAMP WITHOUT TIME ZONE
  FROM
    public.tx_stats_results tsr -- Alias the materialized view for clarity
  ORDER BY
    tsr.starting_slot DESC -- Use the alias in the ORDER BY clause
  LIMIT p_limit OFFSET p_offset;
END;
$$;
