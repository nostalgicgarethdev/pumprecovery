SELECT cron.schedule('0 0 * * *', $$REFRESH MATERIALIZED VIEW unique_daily_users_view$$);
