CREATE TABLE likes (
    username text not null,
    target_id text not null,
    pfp text,
    PRIMARY KEY (username, target_id)
);