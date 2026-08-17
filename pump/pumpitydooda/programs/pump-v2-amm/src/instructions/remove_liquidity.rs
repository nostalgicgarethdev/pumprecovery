use crate::error::ErrorCode;
use crate::state::Amm;
use crate::utils::{spl_token_transfer, TokenTransferParams};
use anchor_lang::prelude::*;

// RemoveLiquidityEvent event
#[event]
pub struct RemoveLiquidityEvent {
    pub base_amount: u64,
    pub quote_amount: u64,
    pub shares: u64,
    pub timestamp: u64,
    pub user: Pubkey,
}

/// Helper function to calculate the amount of base and quote tokens proportional to the shares being removed.
///
/// # Parameters:
/// - `shares`: Number of liquidity shares being removed.
/// - `amm`: Reference to the current state of the AMM.
///
/// # Returns:
/// - Result containing the tuple of base and quote tokens calculated or an error.
fn remove_quote(shares: u64, amm: &Amm) -> Result<(u64, u64)> {
    let base_amount = (shares * amm.base_reserve) / amm.total_shares;
    let quote_amount = (shares * amm.quote_reserve) / amm.total_shares;
    Ok((base_amount, quote_amount))
}

/// The `remove_liquidity` module is responsible for handling the removal of liquidity from the AMM.
/// This includes calculating the amounts of base and quote tokens to be returned for the shares being removed,
/// ensuring the returned amounts meet the user's expectations, and updating the AMM's reserves accordingly.
pub mod remove_liquidity {
    use super::*;
    use crate::RemoveLiquidity;

    /// Handles the removal of liquidity by a user, ensuring minimum amounts are respected.
    ///
    /// # Parameters:
    /// - `ctx`: Context containing all necessary accounts for the transaction.
    /// - `shares`: The number of liquidity shares the user wants to remove.
    /// - `quote_min_amount`: The minimum amount of quote tokens the user expects to receive.
    /// - `base_min_amount`: The minimum amount of base tokens the user expects to receive.
    ///
    /// # Returns:
    /// - Result indicating success or an error.
    pub fn handler(
        ctx: Context<RemoveLiquidity>,
        shares: u64,
        quote_min_amount: u64,
        base_min_amount: u64,
    ) -> Result<()> {
        let base_mint = &ctx.accounts.base_mint;
        let quote_mint = &ctx.accounts.quote_mint;
        let user_lp_ata = &mut ctx.accounts.user_lp_ata;
        let base_reserve_ata = &mut ctx.accounts.base_reserve_ata;
        let quote_reserve_ata = &mut ctx.accounts.quote_reserve_ata;

        // Calculate the amount of base and quote tokens to be returned for the shares
        let (base_amount, quote_amount) = remove_quote(shares, &*ctx.accounts.amm)?;

        // Ensure the returned amounts meet the user's expectations
        require!(
            quote_amount >= quote_min_amount,
            ErrorCode::QuoteAmountTooLow
        );
        require!(base_amount >= base_min_amount, ErrorCode::BaseAmountTooLow);

        // Update the AMM's reserves by subtracting the amounts to be removed
        let amm = &mut ctx.accounts.amm;
        amm.base_reserve -= base_amount;
        amm.quote_reserve -= quote_amount;
        amm.total_shares -= shares;

        // Define seeds for signing operations that require the AMM's authority
        let signer_seeds = [
            b"amm",
            ctx.accounts.amm.creator.as_ref(),
            base_mint.to_account_info().key.as_ref(),
            quote_mint.to_account_info().key.as_ref(),
            &[ctx.bumps.amm],
        ];

        // Transfer the base tokens from the AMM's reserves to the user's account
        let base_token_program = &ctx.accounts.base_token_program.to_account_info();
        let quote_token_program = &ctx.accounts.quote_token_program.to_account_info();

        // Burn the LP shares to reflect the removal of liquidity
        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.base_token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    from: user_lp_ata.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            shares,
        )?;

        spl_token_transfer(TokenTransferParams {
            source: base_reserve_ata.to_account_info(),
            destination: ctx.accounts.user_base_ata.to_account_info(),
            amount: base_amount,
            authority: ctx.accounts.amm.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            decimals: ctx.accounts.base_mint.decimals,
            mint: ctx.accounts.base_mint.to_account_info(),
            token_program: base_token_program.clone(),
        })?;

        // Transfer the quote tokens from the AMM's reserves to the user's account
        spl_token_transfer(TokenTransferParams {
            source: quote_reserve_ata.to_account_info(),
            destination: ctx.accounts.user_quote_ata.to_account_info(),
            amount: quote_amount,
            authority: ctx.accounts.amm.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            decimals: ctx.accounts.quote_mint.decimals,
            mint: ctx.accounts.quote_mint.to_account_info(),
            token_program: quote_token_program.clone(),
        })?;

        // Emit the event
        emit_cpi!(RemoveLiquidityEvent {
            base_amount,
            quote_amount,
            shares,
            timestamp: Clock::get()?.unix_timestamp as u64,
            user: *ctx.accounts.user.to_account_info().key,
        });

        Ok(())
    }
}
