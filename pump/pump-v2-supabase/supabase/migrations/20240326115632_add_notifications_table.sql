create type notification_type as enum('mention', 'like');

create table notifications (
    notification_id serial primary key,
    "user" text not null,
    type notification_type not null,
    target_id text,
    source_user text,
    message text,
    is_read boolean default false,
    timestamp bigint not null default (extract(epoch from now()) * 1000)
);