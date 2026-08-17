use crate::error::ErrorCode;
use crate::utils::{spl_token_transfer, TokenTransferParams};
use crate::{Amm, Buy};
use anchor_lang::prelude::*;

// BuyEvent event
#[event]
pub struct BuyEvent {
    pub base_amount: u64,
    pub quote_amount: u64,
    pub timestamp: u64,
    pub user: Pubkey,
    pub protocol_fee_amount: u64,
    pub referrer: Option<Pubkey>,
    pub referrer_fee_amount: Option<u64>,
}

/// Calculates the required quote amount to obtain a specified amount of base tokens.
///
/// # Parameters:
/// - `output_amount`: Desired amount of base tokens.
/// - `amm`: Reference to the current state of the AMM.
///
/// # Returns:
/// - Result containing the calculated quote amount or an error.
fn buy_quote(output_amount: u64, amm: &Amm) -> Result<u64> {
    let input_amount = (output_amount * amm.quote_reserve) / (amm.base_reserve - output_amount);
    Ok(input_amount)
}

// This module is responsible for processing buy transactions where users exchange quote tokens for base tokens.
pub mod buy {
    use super::*;

    /// Executes a buy transaction where a user buys base tokens using quote tokens.
    ///
    /// # Parameters:
    /// - `ctx`: Context containing all required accounts for the transaction.
    /// - `base_amount`: The amount of base tokens the user wants to buy.
    /// - `max_quote_amount`: The maximum amount of quote tokens the user is willing to spend.
    ///
    /// # Returns:
    /// - Result indicating success or an error.
    pub fn handler<'a>(
        ctx: anchor_lang::context::Context<'_, '_, '_, 'a, Buy<'a>>,
        base_amount: u64,
        max_quote_amount: u64,
    ) -> Result<()> {
        let quote_token_program = ctx.accounts.quote_token_program.to_account_info();
        let base_token_program = ctx.accounts.base_token_program.to_account_info();

        // Calculate the required quote amount for the desired base amount
        let quote_amount = buy_quote(base_amount, &*ctx.accounts.amm)?;

        // Ensure the quote amount does not exceed what the user is willing to pay
        require_gte!(
            max_quote_amount,
            quote_amount,
            ErrorCode::InsufficientQuoteAmount
        );

        // Decrease base reserve and increase quote reserve by the transaction amounts
        let amm = &mut ctx.accounts.amm;
        amm.base_reserve -= base_amount;
        amm.quote_reserve += quote_amount;

        // Define seeds for signing transactions involving the AMM
        let signer_seeds = [
            b"amm",
            ctx.accounts.amm.creator.as_ref(),
            ctx.accounts.base_mint.to_account_info().key.as_ref(),
            ctx.accounts.quote_mint.to_account_info().key.as_ref(),
            &[ctx.bumps.amm],
        ];

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

        // Transfer the quote amount to the AMM reserves
        spl_token_transfer(TokenTransferParams {
            source: ctx.accounts.user_quote_ata.to_account_info(),
            destination: ctx.accounts.quote_reserve_ata.to_account_info(),
            amount: quote_amount,
            authority: ctx.accounts.user.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            decimals: ctx.accounts.quote_mint.decimals,
            mint: ctx.accounts.quote_mint.to_account_info(),
            token_program: quote_token_program.clone(),
        })?;

        // Transfer the purchased base amount to the user
        spl_token_transfer(TokenTransferParams {
            source: ctx.accounts.base_reserve_ata.to_account_info(),
            destination: ctx.accounts.user_base_ata.to_account_info(),
            amount: base_amount,
            authority: ctx.accounts.amm.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            decimals: ctx.accounts.base_mint.decimals,
            mint: ctx.accounts.base_mint.to_account_info(),
            token_program: base_token_program.clone(),
        })?;

        // Emit the event
        emit_cpi!(BuyEvent {
            base_amount,
            quote_amount,
            user: *ctx.accounts.user.to_account_info().key,
            timestamp: Clock::get()?.unix_timestamp as u64,
            referrer: ctx
                .remaining_accounts
                .get(0)
                .map(|r| *r.to_account_info().key),
            referrer_fee_amount,
            protocol_fee_amount
        });

        Ok(())
    }
}
