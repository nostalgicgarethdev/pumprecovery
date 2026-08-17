#![no_main]

use anchor_lang::prelude::*;
use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use pump_amm_fuzz::{AccountsState, PumpAmmFuzzContext};
use std::sync::{Arc, RwLock};

#[derive(Debug, Arbitrary)]
enum Action {
    Deposit {
        account: AccountIdx,
        bank: BankIdx,
        asset_amount: AssetAmount,
    },
    Borrow {
        account: AccountIdx,
        bank: BankIdx,
        asset_amount: AssetAmount,
    },
    UpdateOracle {
        bank: BankIdx,
        price: PriceChange,
    },
    Repay {
        account: AccountIdx,
        bank: BankIdx,
        asset_amount: AssetAmount,
        repay_all: bool,
    },
    Withdraw {
        account: AccountIdx,
        bank: BankIdx,
        asset_amount: AssetAmount,
        withdraw_all: bool,
    },
    Liquidate {
        liquidator: AccountIdx,
        liquidatee: AccountIdx,
        asset_amount: AssetAmount,
    },
}

#[derive(Debug)]
pub struct ActionSequence(Vec<Action>);

impl<'a> Arbitrary<'a> for ActionSequence {
    fn arbitrary(u: &mut arbitrary::Unstructured<'a>) -> arbitrary::Result<Self> {
        let n_actions = 100;
        let mut actions = Vec::with_capacity(n_actions);

        for _ in 0..n_actions {
            let action = Action::arbitrary(u)?;
            actions.push(action);
        }

        Ok(ActionSequence(actions))
    }
}

#[derive(Debug, Arbitrary)]
pub struct FuzzerContext {
    pub action_sequence: ActionSequence,
    pub initial_bank_configs: [BankAndOracleConfig; N_BANKS],
}

fuzz_target!(|data: FuzzerContext| process_actions(data).unwrap());

fn process_actions(ctx: FuzzerContext) -> Result<()> {
    let mut accounts_state = AccountsState::new();

    let mut context =
        PumpAmmFuzzContext::setup(&accounts_state, &ctx.initial_bank_configs, N_USERS as u8);

    context.metrics = Arc::new(RwLock::new(Metrics::default()));

    for action in ctx.action_sequence.0.iter() {
        process_action(action, &context)?;
    }

    context.metrics.read().unwrap().print();
    context.metrics.read().unwrap().log();

    accounts_state.reset();

    Ok(())
}

fn process_action<'bump>(action: &Action, context: &'bump PumpAmmFuzzContext<'bump>) -> Result<()> {
    match action {
        Action::Deposit {
            account,
            bank,
            asset_amount,
        } => context.process_action_deposit(account, bank, asset_amount),
        Action::Withdraw {
            account,
            bank,
            asset_amount,
            withdraw_all,
        } => context.process_action_withdraw(account, bank, asset_amount, *withdraw_all),
        Action::Borrow {
            account,
            bank,
            asset_amount,
        } => context.process_action_borrow(account, bank, asset_amount),
        Action::Repay {
            account,
            bank,
            asset_amount,
            repay_all,
        } => context.process_action_repay(account, bank, asset_amount, *repay_all),
        Action::UpdateOracle { bank, price } => context.process_update_oracle(bank, price),
        Action::Liquidate {
            liquidator,
            liquidatee,
            asset_amount,
        } => context.process_liquidate_account(liquidator, liquidatee, asset_amount),
    }
    Ok(())
}
