use anchor_lang::prelude::*;
use anchor_spl::token::Token;
#[account]
pub struct Amm {
    pub base_mint: Pubkey,  // 32
    pub quote_mint: Pubkey, // 32
    pub base_reserve: u64,  // 8
    pub quote_reserve: u64, // 8
    pub total_shares: u64,  //8
    pub lp_mint: Pubkey,    //32 // sum of bytes = 96+24=120
    pub creator: Pubkey,    //32
    pub base_reserve_ata: Pubkey,
    pub quote_reserve_ata: Pubkey,
}

#[account]
pub struct GlobalParameters {
    pub protocol_fee_bps: u64,
    pub referrer_fee_bps: u64,
    pub referrer_fee_discount_bps: u64,
    pub fee_recipient: Pubkey,
    pub admin: Pubkey,
}
#[event_cpi]
#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer = user, space = 8 + std::mem::size_of::<Amm>(), seeds = [b"amm", user.key().as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(token::authority = amm, token::mint = amm.base_mint)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account( token::authority = amm, token::mint = amm.quote_mint)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(init, payer=user,
    mint::decimals = 6,
    mint::authority = amm.key(),
    mint::freeze_authority = amm.key(),
    )]
    pub lp_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(constraint = base_mint.key() != quote_mint.key())]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(constraint = quote_mint.key() != lp_mint.key())]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub token_program: Program<'info, Token>,
}
#[event_cpi]
#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut, seeds = [b"amm", amm.creator.as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, token::authority = user, token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm, token::mint = amm.base_mint, token::token_program = base_token_program, constraint = base_reserve_ata.key() == amm.base_reserve_ata)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm, token::mint = amm.quote_mint, token::token_program = quote_token_program, constraint = quote_reserve_ata.key() == amm.quote_reserve_ata)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user.key(), token::mint = lp_mint.key())]
    pub user_lp_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, mint::authority = amm, constraint = lp_mint.key() == amm.lp_mint)]
    pub lp_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut, seeds = [b"amm",  amm.creator.as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, token::authority = user, token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm, token::mint = amm.base_mint, token::token_program = base_token_program, constraint = base_reserve_ata.key() == amm.base_reserve_ata)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm, token::mint = amm.quote_mint, token::token_program = quote_token_program, constraint = quote_reserve_ata.key() == amm.quote_reserve_ata)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user.key(), token::mint = lp_mint.key())]
    pub user_lp_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, mint::authority = amm, constraint = lp_mint.key() == amm.lp_mint)]
    pub lp_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub system_program: Program<'info, System>,
}
#[event_cpi]
#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut, seeds = [b"amm", amm.creator.as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    pub global_parameters: Account<'info, GlobalParameters>,
    pub user: Signer<'info>,
    #[account(mut, token::authority = user, token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm.key(), token::mint = amm.base_mint, token::token_program = base_token_program)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm.key(), token::mint = amm.quote_mint, token::token_program = quote_token_program)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = global_parameters.fee_recipient, token::mint = quote_mint.key())]
    pub fee_receiver_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut, seeds = [b"amm", amm.creator.as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    pub global_parameters: Account<'info, GlobalParameters>,
    pub user: Signer<'info>,
    #[account(mut, token::authority = user, token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm.key(), token::mint = amm.base_mint, token::token_program = base_token_program)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm.key(), token::mint = amm.quote_mint, token::token_program = quote_token_program)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = global_parameters.fee_recipient, token::mint = quote_mint.key())]
    pub fee_receiver_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, space =  8 + std::mem::size_of::<GlobalParameters>(), payer = admin, seeds = [b"global_parameters"], bump)]
    pub global_parameters: Account<'info, GlobalParameters>,
    pub system_program: Program<'info, System>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct SetParameters<'info> {
    #[account(mut, seeds = [b"global_parameters"], bump)]
    pub global_parameters: Account<'info, GlobalParameters>,
    #[account(mut, constraint = admin.key() == global_parameters.admin)]
    pub admin: Signer<'info>,
    /// CHECK: fee_recipient
    pub fee_recipient: AccountInfo<'info>,
}
