BEGIN;

-- Drop the existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS cohort_analysis_view;

-- Create the materialized view with a new limit
CREATE MATERIALIZED VIEW cohort_analysis_view AS
SELECT * FROM get_cohort_analysis(91, 0);

COMMIT;