CREATE OR REPLACE FUNCTION public.refresh_tx_stats_materialized()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.tx_stats_materialized;
END;
$$;
