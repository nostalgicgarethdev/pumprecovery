use anchor_lang::prelude::*;
pub mod error;
pub mod fixtures;
pub mod instructions;
pub mod state;
pub mod utils;
use crate::instructions::add_liquidity::AddLiquidityParams;
use crate::instructions::buy::BuyParams;
use crate::instructions::remove_liquidity::RemoveLiquidityParams;
use crate::instructions::sell::SellParams;
use crate::instructions::set_parameters::SetParametersParams;
use state::*;

declare_id!("DGmCYJUNHRFCguze9KdVG98T6Nu4nwUZxnEKEzyaonva");

#[program]
pub mod solana_amm {

    use super::*;

    pub fn create(ctx: Context<Create>) -> Result<()> {
        instructions::create::create::handler(ctx)
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, params: AddLiquidityParams) -> Result<()> {
        instructions::add_liquidity::add_liquidity::handler(ctx, params)
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        params: RemoveLiquidityParams,
    ) -> Result<()> {
        instructions::remove_liquidity::remove_liquidity::handler(ctx, params)
    }
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::initialize::handler(ctx)
    }
    pub fn buy<'a>(ctx: Context<Buy>, params: BuyParams) -> Result<()> {
        instructions::buy::buy::handler(ctx, params)
    }

    pub fn sell<'a>(ctx: Context<Sell>, params: SellParams) -> Result<()> {
        instructions::sell::sell::handler(ctx, params)
    }

    pub fn set_parameters(ctx: Context<SetParameters>, params: SetParametersParams) -> Result<()> {
        instructions::set_parameters::set_parameters::handler(ctx, params)
    }
}
