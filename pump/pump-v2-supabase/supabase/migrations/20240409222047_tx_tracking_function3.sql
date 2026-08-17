CREATE OR REPLACE FUNCTION public.get_tx_stats(
    p_limit integer DEFAULT 30,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    starting_slot BIGINT,
    avg_slot_delta NUMERIC,
    land_rate NUMERIC
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT
    starting_slot,
    avg_slot_delta,
    land_rate
  FROM
    public.tx_stats_materialized
  ORDER BY
    starting_slot DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
