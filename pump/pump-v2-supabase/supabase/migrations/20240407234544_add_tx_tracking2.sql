drop table if exists tx_tracking;
create table tx_tracking (
    "signature" text primary key,
    submitted_slot numeric default 0,
    confirmed_slot numeric default 0
);