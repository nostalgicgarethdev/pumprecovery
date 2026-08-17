CREATE OR REPLACE FUNCTION public.update_tx_stats_results_backfill()
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
        AVG(CASE WHEN tx.confirmed_slot > tx.submitted_slot THEN tx.confirmed_slot - tx.submitted_slot END)::NUMERIC,
        SUM((tx.confirmed_slot - tx.submitted_slot > 0)::INT)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC,
        MAX(tx.timestamp)
    FROM 
        tx_tracking tx
    WHERE 
        tx.timestamp >= batch_start AND tx.timestamp < batch_end
    ON CONFLICT (signature) DO UPDATE
    SET
        starting_slot = EXCLUDED.starting_slot,
        avg_slot_delta = EXCLUDED.avg_slot_delta,
        land_rate = EXCLUDED.land_rate,
        estimated_timestamp = EXCLUDED.estimated_timestamp;
END;
$$ LANGUAGE plpgsql;

drop table if exists public.tx_stats_results;

CREATE TABLE IF NOT EXISTS public.tx_stats_results (
    signature TEXT , -- Ensures uniqueness of each transaction
    starting_slot BIGINT,
    avg_slot_delta NUMERIC,
    land_rate NUMERIC,
    estimated_timestamp TIMESTAMP WITHOUT TIME ZONE -- Assuming you want to store timestamps without time zone information
);
CREATE OR REPLACE FUNCTION public.update_tx_stats_results_backfill()
RETURNS void AS $$
DECLARE
    batch_start TIMESTAMP;
    batch_end TIMESTAMP;
    next_tx TIMESTAMP;
BEGIN

    -- Initialize batch_end to the earliest transaction timestamp
    SELECT MIN(timestamp) INTO batch_end FROM tx_tracking;

    -- Find the earliest timestamp for the next batch to process
    LOOP
        SELECT MIN(tx.timestamp) INTO next_tx FROM tx_tracking tx WHERE tx.timestamp > batch_end;

        -- Exit the loop if no more transactions are found
        IF next_tx IS NULL THEN
            EXIT;
        END IF;

        -- Calculate the start and end of the batch
        batch_start := next_tx;
        batch_end := batch_start + INTERVAL '30 minutes';

        -- Insert the aggregate of the batch into the main table
        INSERT INTO public.tx_stats_results (starting_slot, avg_slot_delta, land_rate, estimated_timestamp)
        SELECT 
            AVG(starting_slot)::BIGINT,
            AVG(avg_slot_delta)::NUMERIC,
            AVG(land_rate)::NUMERIC,
            MAX(estimated_timestamp)
        FROM 
            public.tx_stats_results
        WHERE 
            estimated_timestamp >= batch_start AND estimated_timestamp < batch_end;

    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT public.update_tx_stats_results_backfill();   
