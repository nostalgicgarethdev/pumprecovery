BEGIN;

DROP MATERIALIZED VIEW IF EXISTS unique_daily_users_view;

CREATE MATERIALIZED VIEW unique_daily_users_view AS
SELECT trade_day, daily_active_users FROM get_unique_daily_users(91, 0);

COMMIT;