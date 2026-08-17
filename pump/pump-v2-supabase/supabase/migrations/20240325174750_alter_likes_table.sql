ALTER TABLE likes
drop COLUMN total_likes;

ALTER TABLE replies
ADD COLUMN total_likes numeric DEFAULT 0;
