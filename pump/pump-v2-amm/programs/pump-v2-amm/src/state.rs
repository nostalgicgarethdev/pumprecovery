use crate::instructions::add_liquidity::AddLiquidityParams;
use crate::instructions::buy::BuyParams;
use crate::instructions::remove_liquidity::RemoveLiquidityParams;
use crate::instructions::sell::SellParams;
use crate::instructions::set_parameters::SetParametersParams;
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
}

#[account]
pub struct GlobalParameters {
    pub protocol_fee_bps: u64,
    pub referrer_fee_bps: u64,
    pub referrer_fee_discount_bps: u64,
    pub fee_recipient: Pubkey,
    pub admin: Pubkey,
}
#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer = user, space = 8 + std::mem::size_of::<Amm>(), seeds = [b"amm", user.key().as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(init, payer=user,
    mint::decimals = 9,
    mint::authority = amm.key(),
    mint::freeze_authority = amm.key(),
    )]
    pub lp_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub token_program: Program<'info, Token>,
}
//#[event_cpi]
#[derive(Accounts)]
#[instruction(params: AddLiquidityParams)]
pub struct AddLiquidity<'info> {
    #[account(mut, seeds = [b"amm", amm.creator.as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK:
    pub user_base_ata: AccountInfo<'info>,
    /// CHECK:
    pub user_quote_ata: AccountInfo<'info>,
    #[account(mut, token::authority = amm, token::mint = base_mint, token::token_program = base_token_program)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm, token::mint = quote_mint, token::token_program = quote_token_program)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    /// CHECK:
    pub user_lp_ata: AccountInfo<'info>,
    #[account(mut)]
    pub lp_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    /// CHECK:
    pub base_token_program: AccountInfo<'info>,
    /// CHECK:
    pub quote_token_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

//#[event_cpi]
#[derive(Accounts)]
#[instruction(params: RemoveLiquidityParams)]
pub struct RemoveLiquidity<'info> {
    #[account(mut, seeds = [b"amm",  amm.creator.as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, token::authority = user, token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm, token::mint = base_mint, token::token_program = base_token_program)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm, token::mint = quote_mint, token::token_program = quote_token_program)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user.key(), token::mint = lp_mint.key())]
    pub user_lp_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut)]
    pub lp_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,

    pub system_program: Program<'info, System>,
}

//#[event_cpi]
#[derive(Accounts)]
#[instruction(params: BuyParams)]
pub struct Buy<'info> {
    #[account(mut, seeds = [b"amm", amm.creator.as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    #[account(seeds = [b"global_parameters"], bump)]
    pub global_parameters: Account<'info, GlobalParameters>,
    pub user: Signer<'info>,
    #[account(mut, token::authority = user, token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm.key(), token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm.key(), token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = global_parameters.fee_recipient, token::mint = quote_mint.key())]
    pub fee_receiver_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    #[account(mut, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub referral_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
}

//#[event_cpi]
#[derive(Accounts)]
#[instruction(params: SellParams)]
pub struct Sell<'info> {
    #[account(mut, seeds = [b"amm", amm.creator.as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()], bump)]
    pub amm: Account<'info, Amm>,
    #[account(seeds = [b"global_parameters"], bump)]
    pub global_parameters: Account<'info, GlobalParameters>,
    pub user: Signer<'info>,
    #[account(mut, token::authority = user, token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = user, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm.key(), token::mint = base_mint.key(), token::token_program = base_token_program)]
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = amm.key(), token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut, token::authority = global_parameters.fee_recipient, token::mint = quote_mint.key())]
    pub fee_receiver_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    #[account(mut)]
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    #[account(mut, token::mint = quote_mint.key(), token::token_program = quote_token_program)]
    pub referral_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, space =  8 + std::mem::size_of::<GlobalParameters>(), payer = admin, seeds = [b"global_parameters"], bump)]
    pub global_parameters: Account<'info, GlobalParameters>,
    pub system_program: Program<'info, System>,
}

//#[event_cpi]
#[derive(Accounts)]
#[instruction(params: SetParametersParams)]
pub struct SetParameters<'info> {
    #[account(mut, seeds = [b"global_parameters"], bump)]
    pub global_parameters: Account<'info, GlobalParameters>,
    #[account(mut, constraint = admin.key() == global_parameters.admin)]
    pub admin: Signer<'info>,
    /// CHECK: fee_recipient
    pub fee_recipient: AccountInfo<'info>,
}
