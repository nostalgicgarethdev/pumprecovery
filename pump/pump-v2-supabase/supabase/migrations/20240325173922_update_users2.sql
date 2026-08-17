-- Drop the existing table
DROP TABLE IF EXISTS users2;

-- Create the new table with the desired structure
CREATE TABLE users2 (
    address text PRIMARY KEY,
    likes_received numeric DEFAULT 0
);