ALTER TABLE notifications ALTER COLUMN target_id TYPE text USING target_id::text;
ALTER TYPE notification_type ADD VALUE 'follow';