use crate::error::ErrorCode;
use crate::utils::{spl_token_transfer, TokenTransferParams};
use crate::Amm;
use anchor_lang::prelude::*;

// SellEvent event
#[event]
pub struct SellEvent {
    pub base_amount: u64,
    pub quote_amount: u64,
    pub timestamp: u64,
    pub user: Pubkey,
    pub protocol_fee_amount: u64,
    pub referrer: Option<Pubkey>,
    pub referrer_fee_amount: Option<u64>,
}
/// Calculates the amount of base tokens received for selling a given amount of quote tokens using the xyk invariant without any fees.
///
/// # Arguments
/// * `base_amount` - The amount of base tokens being sold by the user.
/// * `amm` - The AMM account containing the reserves for the base and quote tokens.
///
/// # Returns
/// * `Result<u64>` - The amount of base tokens received for the given quote amount.
fn sell_quote(base_amount: u64, amm: &Amm) -> Result<u64> {
    let quote_amount = (base_amount * amm.quote_reserve) / (amm.base_reserve + base_amount);
    Ok(quote_amount)
}

/// This Sell module is responsible for handling the selling of tokens from the AMM.
/// It includes the logic for calculating the required quote amount, transferring tokens,
/// and emitting events.
pub mod sell {
    use super::*;
    use crate::Sell;

    /// Executes a sell transaction where a user sells base tokens for quote tokens.
    ///
    /// # Parameters:
    /// * `ctx` - The context in which this handler is executed, containing all necessary accounts.
    /// * `base_amount` - The amount of the base token being sold by the user.
    /// * `min_quote_amount` - The minimum amount of quote tokens the user expects to receive.
    ///
    /// # Returns:
    /// * `Result<()>` - Returns `Ok(())` if the transaction is successful.
    pub fn handler<'a>(
        ctx: Context<'_, '_, '_, 'a, Sell<'a>>,
        base_amount: u64,
        min_quote_amount: u64,
    ) -> Result<()> {
        let base_token_program = ctx.accounts.base_token_program.to_account_info();
        let quote_token_program = ctx.accounts.quote_token_program.to_account_info();

        // Calculate the required quote amount using AMM reserves
        let quote_amount = sell_quote(base_amount, &*ctx.accounts.amm)?;
        require_gte!(
            quote_amount,
            min_quote_amount,
            ErrorCode::InsufficientQuoteAmount
        );

        // Update AMM reserves
        let amm = &mut ctx.accounts.amm;
        amm.base_reserve += base_amount;
        amm.quote_reserve -= quote_amount;

        // Transfer base amount from user to base reserve
        spl_token_transfer(TokenTransferParams {
            source: ctx.accounts.user_base_ata.to_account_info(),
            destination: ctx.accounts.base_reserve_ata.to_account_info(),
            amount: base_amount,
            authority: ctx.accounts.user.to_account_info(),
            authority_signer_seeds: &[],
            decimals: ctx.accounts.base_mint.decimals,
            mint: ctx.accounts.base_mint.to_account_info(),
            token_program: base_token_program.clone(),
        })?;

        let signer_seeds = [
            b"amm",
            ctx.accounts.amm.creator.as_ref(),
            ctx.accounts.base_mint.to_account_info().key.as_ref(),
            ctx.accounts.quote_mint.to_account_info().key.as_ref(),
            &[ctx.bumps.amm],
        ];

        // Transfer quote amount from quote reserve to user
        spl_token_transfer(TokenTransferParams {
            source: ctx.accounts.quote_reserve_ata.to_account_info(),
            destination: ctx.accounts.user_quote_ata.to_account_info(),
            amount: quote_amount,
            authority: ctx.accounts.amm.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            decimals: ctx.accounts.quote_mint.decimals,
            mint: ctx.accounts.quote_mint.to_account_info(),
            token_program: quote_token_program.clone(),
        })?;

        let mut protocol_fee_bps = ctx.accounts.global_parameters.protocol_fee_bps;
        let mut referrer_fee_amount = None;

        // Transfer the fee to refferer if set and apply protocol fee discount.
        if ctx.remaining_accounts.len() > 0 {
            protocol_fee_bps -= ctx.accounts.global_parameters.referrer_fee_discount_bps;
            let referrer_fee_bps = ctx.accounts.global_parameters.referrer_fee_bps;
            referrer_fee_amount = Some((quote_amount * referrer_fee_bps) / 10000);

            spl_token_transfer(TokenTransferParams {
                source: ctx.accounts.user_quote_ata.to_account_info(),
                // This account is checked in one of the token program instructions
                destination: ctx.remaining_accounts.get(0).unwrap().to_account_info(),
                amount: referrer_fee_amount.unwrap(),
                authority: ctx.accounts.user.to_account_info(),
                authority_signer_seeds: &[],
                decimals: ctx.accounts.quote_mint.decimals,
                mint: ctx.accounts.quote_mint.to_account_info(),
                token_program: quote_token_program.clone(),
            })?;
        }

        // Transfer the protocol fee to the fee receiver
        let protocol_fee_amount = (quote_amount * protocol_fee_bps) / 10000;
        spl_token_transfer(TokenTransferParams {
            source: ctx.accounts.user_quote_ata.to_account_info(),
            destination: ctx.accounts.fee_receiver_ata.to_account_info(),
            amount: protocol_fee_amount,
            authority: ctx.accounts.user.to_account_info(),
            authority_signer_seeds: &[],
            decimals: ctx.accounts.quote_mint.decimals,
            mint: ctx.accounts.quote_mint.to_account_info(),
            token_program: quote_token_program.clone(),
        })?;

        // Emit the event
        emit_cpi!(SellEvent {
            base_amount,
            quote_amount,
            timestamp: Clock::get()?.unix_timestamp as u64,
            referrer: ctx
                .remaining_accounts
                .get(0)
                .map(|r| *r.to_account_info().key),
            referrer_fee_amount,
            protocol_fee_amount,
            user: *ctx.accounts.user.to_account_info().key,
        });

        Ok(())
    }
}
