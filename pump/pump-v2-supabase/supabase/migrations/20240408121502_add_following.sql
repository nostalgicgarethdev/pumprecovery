create table if not exists following (
    following_id text not null,
    user_id text not null,
    timestamp bigint not null default (extract(epoch from now()) * 1000)::bigint,
    primary key (following_id, user_id),
    check (following_id != user_id)
);