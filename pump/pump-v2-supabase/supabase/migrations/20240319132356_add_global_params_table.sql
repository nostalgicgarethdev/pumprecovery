create table global_params (
    slot numeric not null,
    signature text primary key not null,
    initial_virtual_token_reserves numeric not null,
    initial_virtual_sol_reserves numeric not null,
    initial_real_token_reserves numeric not null,
    token_total_supply numeric not null,
    fee_basis_points numeric not null,
    timestamp numeric not null
);