-- Drop the existing likes table if it exists
DROP TABLE IF EXISTS likes;

-- Create a new likes table
CREATE TABLE likes (
    target_id TEXT NOT NULL,
    "user" TEXT NOT NULL,
    timestamp BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT,
    PRIMARY KEY (target_id, "user")
);