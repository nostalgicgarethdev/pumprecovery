CREATE TABLE profiles (
    "user" TEXT primary key,
    sold_30_min_score NUMERIC,
    sold_1_hr_score NUMERIC,
    amount_tokens_held_score NUMERIC,
    amount_tokens_bought_score NUMERIC,
    patron_count NUMERIC,
    don_count NUMERIC,
    dh_count NUMERIC
);
