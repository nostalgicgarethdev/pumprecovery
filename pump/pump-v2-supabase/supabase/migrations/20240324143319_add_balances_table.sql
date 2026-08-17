CREATE TABLE balances (
    address TEXT NOT NULL,
    mint TEXT NOT NULL,
    balance NUMERIC NOT NULL,
    name TEXT,
    symbol TEXT,
    PRIMARY KEY (mint, address)
);