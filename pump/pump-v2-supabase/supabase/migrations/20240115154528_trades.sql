create table trades (
    "signature" text primary key,
    mint text references coins(mint),
    sol_amount numeric,
    token_amount numeric,
    is_buy boolean,
    "user" text,
    timestamp numeric
);