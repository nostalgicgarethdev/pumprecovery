create table messages (
    id bigint primary key generated always as identity,
    msg text unique,
    twitter_username text,
    user_id bigint references users(id),
    verified boolean default false, -- can this be removed?
    address text
);