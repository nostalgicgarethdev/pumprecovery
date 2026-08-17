BEGIN;

CREATE MATERIALIZED VIEW IF NOT EXISTS cohort_analysis_view AS
SELECT * FROM get_cohort_analysis(31, 0);

COMMIT;