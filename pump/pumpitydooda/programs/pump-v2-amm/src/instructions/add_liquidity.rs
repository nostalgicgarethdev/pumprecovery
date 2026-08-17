use crate::error::ErrorCode;
use crate::utils::{spl_token_transfer, TokenTransferParams};
use anchor_lang::prelude::*;
use num_integer::Roots;

// Define a constant for the minimum liquidity threshold
const MINIMUM_LIQUIDITY: u64 = 100_000;

// AddLiquidityEvent event
#[event]
pub struct AddLiquidityEvent {
    pub base_amount: u64,
    pub quote_amount: u64,
    pub shares: u64,
    pub timestamp: u64,
    pub user: Pubkey,
}

/// Calculates the number of shares a user will receive for their liquidity based on the
/// current state of the Automated Market Maker (AMM).
///
/// # Parameters:
/// - `base_token_amount`: Amount of the base token the user wants to deposit.
/// - `quote_token_amount`: Amount of the quote token the user wants to deposit.
/// - `base_reserve`: Current reserve of the base token in the AMM.
/// - `quote_reserve`: Current reserve of the quote token in the AMM.
/// - `total_shares`: Current total number of shares in the AMM.
///
/// # Returns:
/// - Result containing the number of shares or an error.
fn calculate_shares(
    base_token_amount: u64,
    quote_token_amount: u64,
    base_reserve: u64,
    quote_reserve: u64,
    total_shares: u64,
) -> Result<u64> {
    if total_shares != 0 {
        // Calculate amount of LP tokens as a fraction of existing reserves
        let base_token_share = (base_token_amount * total_shares) / base_reserve;
        let fractional_token_share = (quote_token_amount * total_shares) / quote_reserve;
        Ok(base_token_share.min(fractional_token_share))
    } else {
        // Initialize shares when there's no existing liquidity
        let initial_shares = (base_token_amount * quote_token_amount).sqrt();
        Ok(initial_shares)
    }
}

/// This submodule is dedicated to handling the addition of liquidity to the Automated Market Maker (AMM).
/// It includes functions and structures necessary for processing liquidity transactions, ensuring that
/// the liquidity added is correctly accounted for and integrated into the AMM's existing pool.
pub mod add_liquidity {
    use super::*;
    use crate::AddLiquidity;

    /// Handles liquidity addition to the AMM, ensuring that liquidity constraints are met and updating AMM reserves.
    ///
    /// # Parameters:
    /// - `ctx`: Context containing all the accounts required to execute the operation.
    /// - `base_amount`: Amount of the base currency being added.
    /// - `quote_amount`: Amount of the quote currency being added.
    /// - `min_lp_shares`: Minimum number of liquidity provider (LP) shares the user expects to receive.
    ///
    /// # Returns:
    /// - Result indicating success or error state.
    pub fn handler(
        ctx: Context<AddLiquidity>,
        base_amount: u64,
        quote_amount: u64,
        min_lp_shares: u64,
    ) -> Result<()> {
        // Retrieve account information for mints and token accounts
        let base_mint = &ctx.accounts.base_mint;
        let quote_mint = &ctx.accounts.quote_mint;
        let base_reserve_ata = &ctx.accounts.base_reserve_ata;
        let quote_reserve_ata = &ctx.accounts.quote_reserve_ata;
        let lp_mint = &ctx.accounts.lp_mint;

        // Calculate and mint liquidity tokens (shares)
        let shares = calculate_shares(
            base_amount,
            quote_amount,
            ctx.accounts.amm.base_reserve,
            ctx.accounts.amm.quote_reserve,
            ctx.accounts.amm.total_shares,
        )?;
        require_gte!(shares, min_lp_shares, ErrorCode::InsufficientLiquidity);
        {
            // Update AMM state with new reserves and total shares
            let amm = &mut ctx.accounts.amm;
            amm.base_reserve += base_amount;
            amm.quote_reserve += quote_amount;
            amm.total_shares += shares;
        }
        // Define signer seeds for transactions requiring signatures
        let signer_seeds = [
            b"amm",
            ctx.accounts.amm.creator.as_ref(),
            base_mint.to_account_info().key.as_ref(),
            quote_mint.to_account_info().key.as_ref(),
            &[ctx.bumps.amm],
        ];

        // Mint the minimum liquidity to the user
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.base_token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.user_lp_ata.to_account_info(),
                    authority: ctx.accounts.amm.to_account_info(),
                },
                &[&signer_seeds],
            ),
            shares,
        )?;

        // Handle liquidity initialization case when LP mint amount is zero
        if lp_mint.supply == 0 {
            // Burn the minimum liquidity from the user's account
            anchor_spl::token::burn(
                CpiContext::new(
                    ctx.accounts.base_token_program.to_account_info(),
                    anchor_spl::token::Burn {
                        mint: ctx.accounts.lp_mint.to_account_info(),
                        from: ctx.accounts.user_lp_ata.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                MINIMUM_LIQUIDITY,
            )?;
        }

        // Transfer base tokens to the AMM reserves
        spl_token_transfer(TokenTransferParams {
            source: ctx.accounts.user_base_ata.to_account_info(),
            destination: base_reserve_ata.to_account_info(),
            amount: base_amount,
            authority: ctx.accounts.user.to_account_info(),
            authority_signer_seeds: &[],
            decimals: ctx.accounts.base_mint.decimals,
            mint: ctx.accounts.base_mint.to_account_info(),
            token_program: ctx.accounts.base_token_program.to_account_info(),
        })?;

        // Transfer quote tokens to the AMM reserves
        spl_token_transfer(TokenTransferParams {
            source: ctx.accounts.user_quote_ata.to_account_info(),
            destination: quote_reserve_ata.to_account_info(),
            amount: quote_amount,
            authority: ctx.accounts.user.to_account_info(),
            authority_signer_seeds: &[],
            decimals: ctx.accounts.quote_mint.decimals,
            mint: ctx.accounts.quote_mint.to_account_info(),
            token_program: ctx.accounts.quote_token_program.to_account_info(),
        })?;

        // Emit the event
        emit_cpi!(AddLiquidityEvent {
            base_amount,
            quote_amount,
            shares,
            timestamp: Clock::get()?.unix_timestamp as u64,
            user: *ctx.accounts.user.key,
        });

        Ok(())
    }
}