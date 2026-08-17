CREATE TABLE comments (
    is_confirmed BOOLEAN NOT NULL,
    content TEXT NOT NULL,
    timestamp numeric NOT NULL,
    signature TEXT PRIMARY KEY,
    "user" TEXT,
    is_buy BOOLEAN,
    sol_amount NUMERIC,
    mint_id Text
);