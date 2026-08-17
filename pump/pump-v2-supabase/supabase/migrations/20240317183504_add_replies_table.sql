create table replies (
    id serial primary key,
    mint text not null references coins(mint),
    file_uri text,
    text text not null,
    "user" text not null,
    timestamp bigint not null default (extract(epoch from now()) * 1000)
);