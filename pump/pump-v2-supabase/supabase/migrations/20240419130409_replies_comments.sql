alter table replies add column if not exists sol_amount bigint default null;
alter table replies  add column if not exists is_confirmed boolean default null;
alter table replies  add column if not exists signature text default null;
alter table replies  add column if not exists is_buy boolean default null;