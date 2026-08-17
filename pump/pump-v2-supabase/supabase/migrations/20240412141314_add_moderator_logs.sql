create table moderator_logs (
    id serial primary key,
    timestamp bigint not null default (extract(epoch from now()) * 1000),
    moderator text not null,
    description text not null
);

