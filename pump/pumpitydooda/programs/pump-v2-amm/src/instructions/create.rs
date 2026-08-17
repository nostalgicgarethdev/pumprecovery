use anchor_lang::prelude::*;

// CreateEvent event
#[event]
pub struct CreateEvent {
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub lp_mint: Pubkey,
    pub timestamp: u64,
    pub user: Pubkey,
}
// This section defines the `create` module, which is responsible for encapsulating the logic necessary to initialize and configure a new Automated Market Maker (AMM) instance. This includes setting up the foundational parameters such as mint addresses for the base, quote, and liquidity provider tokens, and ensuring that the AMM is ready for subsequent operations like adding liquidity, trading, etc.
pub mod create {
    use super::*;
    use crate::Create; // Import the Create instruction structure // Import other necessary components from the parent module

    /// Handles the initialization of an AMM, setting up its basic components such as mint addresses.
    ///
    /// # Parameters:
    /// - `ctx`: Context containing all the accounts required for AMM initialization.
    ///
    /// # Returns:
    /// - Result indicating success or an error.
    pub fn handler(ctx: Context<Create>) -> Result<()> {
        // Initialize AMM state and populate fields
        let amm = &mut ctx.accounts.amm;
        amm.base_mint = ctx.accounts.base_mint.key();
        amm.quote_mint = ctx.accounts.quote_mint.key();
        amm.lp_mint = ctx.accounts.lp_mint.key();
        amm.creator = ctx.accounts.user.key();
        amm.base_reserve_ata = ctx.accounts.base_reserve_ata.key();
        amm.quote_reserve_ata = ctx.accounts.quote_reserve_ata.key();

        // Emit the event
        emit_cpi!(CreateEvent {
            base_mint: *ctx.accounts.base_mint.to_account_info().key,
            quote_mint: *ctx.accounts.quote_mint.to_account_info().key,
            lp_mint: *ctx.accounts.lp_mint.to_account_info().key,
            timestamp: Clock::get()?.unix_timestamp as u64,
            user: *ctx.accounts.user.to_account_info().key,
        });

        Ok(())
    }
}
