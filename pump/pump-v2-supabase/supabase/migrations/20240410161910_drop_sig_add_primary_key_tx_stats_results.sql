
-- Drop the 'signature' column from 'tx_stats_results' with the CASCADE option
ALTER TABLE public.tx_stats_results
DROP COLUMN signature CASCADE;

-- Add a primary key constraint to the 'estimated_timestamp' column
-- This assumes that 'estimated_timestamp' values are unique and not null.
-- If the column contains nulls or duplicates, the script will fail,
-- and you'll need to address those issues first.
ALTER TABLE public.tx_stats_results
ADD PRIMARY KEY (estimated_timestamp);