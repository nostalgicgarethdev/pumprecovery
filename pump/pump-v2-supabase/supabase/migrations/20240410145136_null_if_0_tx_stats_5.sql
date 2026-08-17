CREATE OR REPLACE FUNCTION public.update_tx_stats_results()
RETURNS void AS $$
DECLARE
    batch_start TIMESTAMP;
    batch_end TIMESTAMP;
    
BEGIN
    -- Calculate the time range for the batch: last 31 minutes from now
    batch_end := NOW();
    batch_start := batch_end - INTERVAL '31 minutes';

    -- Insert aggregated data directly into tx_stats_results table
    INSERT INTO public.tx_stats_results (signature, starting_slot, avg_slot_delta, land_rate, estimated_timestamp)
    SELECT 
        'aggregate',
        MIN(tx.submitted_slot)::BIGINT,
        AVG(tx.confirmed_slot - tx.submitted_slot)::NUMERIC,
        SUM((tx.confirmed_slot - tx.submitted_slot > 0)::INT)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC,
        MAX(tx.timestamp)
    FROM 
        tx_tracking tx
    WHERE 
        tx.timestamp >= batch_start AND tx.timestamp < batch_end;
END;
$$ LANGUAGE plpgsql;