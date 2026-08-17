CREATE TABLE IF NOT EXISTS public.tx_stats_results (
    signature TEXT PRIMARY KEY, -- Ensures uniqueness of each transaction
    starting_slot BIGINT,
    avg_slot_delta NUMERIC,
    land_rate NUMERIC,
    estimated_timestamp TIMESTAMP WITHOUT TIME ZONE -- Assuming you want to store timestamps without time zone information
);

DROP MATERIALIZED VIEW IF EXISTS public.tx_stats_materialized;

CREATE OR REPLACE FUNCTION public.update_tx_stats_results()
RETURNS void AS $$
BEGIN
    -- Inserting new records into tx_stats_results with computed statistics
    INSERT INTO public.tx_stats_results (signature, starting_slot, avg_slot_delta, land_rate, estimated_timestamp)
    SELECT 
        tx.signature,
        tx.submitted_slot::BIGINT AS starting_slot,
        AVG(tx.confirmed_slot - tx.submitted_slot)::NUMERIC AS avg_slot_delta,
        COUNT(*) FILTER (WHERE tx.confirmed_slot - tx.submitted_slot > 0) / COUNT(*)::NUMERIC AS land_rate,
        MIN(tx.timestamp) AS estimated_timestamp -- Assuming 'timestamp' column exists in tx_tracking table
    FROM 
        tx_tracking tx
    WHERE 
        tx.timestamp > NOW() - INTERVAL '31 minutes' -- Only considering recent transactions
        AND tx.signature NOT IN (SELECT signature FROM public.tx_stats_results) -- Ensuring uniqueness
    GROUP BY 
        tx.signature
    ON CONFLICT (signature) DO NOTHING; -- Skip if signature already exists
END;
$$ LANGUAGE plpgsql;
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('*/30 * * * *', $$SELECT public.update_tx_stats_results()$$);
