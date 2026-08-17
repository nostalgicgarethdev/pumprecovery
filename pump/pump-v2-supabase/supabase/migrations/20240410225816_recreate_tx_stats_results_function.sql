drop function if exists update_tx_stats_results;

CREATE OR REPLACE FUNCTION update_tx_stats_results()
RETURNS VOID AS $$


DECLARE
    batch_start TIMESTAMP;
    batch_end TIMESTAMP;
    
BEGIN
    -- Calculate the time range for the batch: last 31 minutes from now
    batch_end := NOW();
    batch_start := batch_end - INTERVAL '31 minutes';

    -- Insert aggregated data directly into tx_stats_results table
    INSERT INTO public.tx_stats_results (starting_slot, avg_slot_delta, land_rate, estimated_timestamp)
    SELECT 
        MIN(tx.submitted_slot)::BIGINT,
        AVG(CASE WHEN tx.confirmed_slot > tx.submitted_slot THEN tx.confirmed_slot - tx.submitted_slot END)::NUMERIC,
        SUM((tx.confirmed_slot - tx.submitted_slot > 0)::INT)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC,
        case 
            when COUNT(*) = 0 then timestamp 'epoch'
            else MIN(tx.timestamp) + (MAX(tx.timestamp) - MIN(tx.timestamp)) / 2
        end::TIMESTAMP
    FROM 
        tx_tracking tx
    WHERE 
        tx.timestamp >= batch_start AND tx.timestamp < batch_end;
END;

$$ LANGUAGE plpgsql;
select update_tx_stats_results();