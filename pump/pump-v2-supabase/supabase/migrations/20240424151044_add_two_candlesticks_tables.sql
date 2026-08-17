create table candlesticks60 (
    primary key (mint, timestamp),
    mint text references coins(mint),
    timestamp numeric,
    open numeric,
    high numeric,
    low numeric,
    close numeric,
    volume numeric,
    slot numeric 
);
create table candlesticks900 (
    primary key (mint, timestamp),
    mint text references coins(mint),
    timestamp numeric,
    open numeric,
    high numeric,
    low numeric,
    close numeric,
    volume numeric,
    slot numeric 
);