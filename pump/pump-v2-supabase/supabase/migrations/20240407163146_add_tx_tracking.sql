create table tx_tracking (
    "signature" text primary key,
    landed boolean not null default false,
    submitted_slot numeric default 0,
    confirmed_slot numeric default 0
);