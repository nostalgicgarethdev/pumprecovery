create table candlesticks (
    primary key (mint, timestamp),
    mint text references coins(mint),
    timestamp numeric,
    open numeric,
    high numeric,
    low numeric,
    close numeric,
    volume numeric
);