create table users (
    id bigint primary key generated always as identity,
    twitter_username text
);
