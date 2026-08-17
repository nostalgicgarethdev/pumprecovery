ALTER TABLE users2
DROP COLUMN last_username_update_timestamp;

ALTER TABLE users2
ADD COLUMN last_username_update_timestamp NUMERIC DEFAULT 0;