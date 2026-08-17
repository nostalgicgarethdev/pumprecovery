CREATE EXTENSION IF NOT EXISTS pg_cron;
BEGIN;

SELECT cron.schedule(
  'Refresh Cohort Analysis View Daily',
  '0 0 * * *',
  'REFRESH MATERIALIZED VIEW cohort_analysis_view;'
);

COMMIT;
