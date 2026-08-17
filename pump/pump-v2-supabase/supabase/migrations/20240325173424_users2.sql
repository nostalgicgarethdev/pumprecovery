ALTER TABLE likes
ADD COLUMN total_likes numeric DEFAULT 0;

CREATE TABLE users2 (
    "user" text PRIMARY KEY,
    likes_received numeric DEFAULT 0
);

