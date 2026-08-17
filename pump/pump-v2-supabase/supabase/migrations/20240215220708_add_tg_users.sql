CREATE TABLE tg_users (
    user_id numeric PRIMARY KEY,
    username text not null,
    address text,
    code text UNIQUE NOT NULL
);