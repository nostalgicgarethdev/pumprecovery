ALTER TABLE bans
ADD COLUMN by_admin TEXT NOT NULL DEFAULT 'admin address';