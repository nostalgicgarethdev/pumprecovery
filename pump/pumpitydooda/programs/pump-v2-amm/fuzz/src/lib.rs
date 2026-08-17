use account_state::{AccountInfoCache, AccountsState};
use anchor_lang::{
    prelude::{
        Account, AccountInfo, AccountLoader, Context, Program, Pubkey, Rent, Signer, SolanaSysvar,
        Sysvar,
    },
    Discriminator, Key,
};
use arbitrary_helpers::{AccountIdx, AssetAmount, BankAndOracleConfig, BankIdx, PriceChange};
use bank_accounts::{get_bank_map, BankAccounts};

use fixed_macro::types::I80F48;

use pump_v2_amm::*;
use metrics::{MetricAction, Metrics};

use solana_program::system_program;

use std::{
    collections::{BTreeMap, HashMap},
    mem::size_of,
    ops::AddAssign,
    sync::{Arc, RwLock},
    time::{SystemTime, UNIX_EPOCH},
};
use stubs::test_syscall_stubs;
use user_accounts::UserAccount;

pub mod account_state;
pub mod arbitrary_helpers;
pub mod bank_accounts;
pub mod metrics;
pub mod stubs;
pub mod user_accounts;

type SplAccount = spl_token::state::Account;
pub struct PumpAmmFuzzContext<'info> {
    pub amm_account: Vec<AccountInfo<'info>>,
    pub user_accounts: Vec<UserAccount<'info>>,
    pub owner: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub rent_sysvar: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub last_sysvar_current_timestamp: RwLock<u64>,
    pub metrics: Arc<RwLock<Metrics>>,
    pub state: &'info AccountsState,
}

impl<'bump> PumpAmmFuzzContext<'bump> {
    impl<'info> PumpAmmFuzzContext<'info> {
        pub fn setup(state: &'info AccountsState, n_users: u8) -> Self {
            let program_id = crate::id();
    
            // Setup mints and accounts
            let base_mint = state.new_token_mint(Rent::free(), 9);
            let quote_mint = state.new_token_mint(Rent::free(), 9);
            let data = self.bump.alloc_slice_fill_copy(Mint::LEN, 0u8);
            let mut lp_mint = Mint::default();
            lp_mint.is_initialized = false;

            let lp_mint = AccountInfo::new(
                self.random_pubkey(),
                false,
                true,
                self.bump.alloc(rent.minimum_balance(data.len())),
                data,
                &spl_token::ID,
                false,
                Epoch::default(),
            );
            // Initialize global parameters if not already initialized
            let global_parameters = initialize(state, owner, system_program);
    
            // Create and initialize AMM account
            let create_amm = create_amm(
                &state, owner, system_program, base_mint, quote_mint, global_parameters, lp_mint
            );
    
            PumpAmmFuzzContext {
                amm_account,
                user_accounts,
                owner: global_parameters, // Assuming global_parameters has a pubkey field
                system_program,
                rent_sysvar,
                token_program,
                last_sysvar_current_timestamp,
                metrics,
                state,
            }
        }

    pub fn advance_time(&self, time: u64) {
        self.last_sysvar_current_timestamp
            .write()
            .unwrap()
            .add_assign(time);

        test_syscall_stubs(Some(
            *self.last_sysvar_current_timestamp.read().unwrap() as i64
        ));
    }
    }
    pub fn process_initialize_amm(&self) {
        let initialize_amm_ix = initialize_amm_instruction(
            &self.program_id,
            &self.amm_account,
            &self.base_mint,
            &self.quote_mint,
            &self.global_parameters
        );
    }

    pub fn fuzz_set_parameters() {
        let program_id = crate::id();
        let (global_parameters, _global_parameters_bump) =
            solana_sdk::pubkey::Pubkey::find_program_address(&[b"global_parameters"], &program_id);
        let (amm_account, _amm_account_bump) = Pubkey::find_program_address(
            &[
                b"amm",
                payer.pubkey().as_ref(),
                base_mint.as_ref(),
                quote_mint.as_ref(),
            ],
            program_id,
        );

        let payer = Signer::try_from(&self.owner)? ;

        let mut accounts = BTreeMap::new();
        accounts.insert("global_parameters", AccountInfo::new(&global_parameters, false, false, &mut [], &program_id));
        accounts.insert("payer_pubkey", AccountInfo::new_readonly(&payer, true, &program_id));
        accounts.insert("fee_receiver_pubkey", AccountInfo::new(&fee_receiver_pubkey, false, false, &mut [], &program_id));

        let ctx = Context::new(
            &program_id,
            &mut set_parameters::Accounts {
                global_parameters: AccountLoader::try_from(&global_parameters).unwrap(),
                payer_pubkey: AccountLoader::try_from(&payer_pubkey).unwrap(),
                fee_receiver_pubkey: AccountLoader::try_from(&fee_receiver_pubkey).unwrap(),
            },
            &[],
            accounts,
        );

        let result = set_parameters::handler(ctx);
        assert!(result.is_ok());
    }
    


}

#[cfg(test)]
mod fuzz_tests {
    use super::*;
    use pump_v2_amm::instructions::set_parameters;
    use std::collections::BTreeMap;
    use anchor_lang::prelude::*;

}


fn initialize<'bump>(
    state: &'bump AccountsState,
    admin: AccountInfo<'bump>,
    system_program: AccountInfo<'bump>,
) -> AccountInfo<'bump> {
    let program_id =pump_v2_amm::id();
    let global_parameters =
        state.new_owned_account(size_of::<GlobalParameters>(), program_id, Rent::free());

    pump_v2_amm::instructions::initialize(Context::new(
        &pump_v2_amm::id(),
        &mut initialize::Accounts {
            admin: Signer::try_from(&admin).unwrap(),
            global_parameters: Account::try_from(&global_parameters).unwrap(),
            system_program: Program::try_from(&system_program).unwrap(),
        },
        &[],
        BTreeMap::new(),
    ))
    .unwrap();

    set_discriminator::<GlobalParameters>(global_parameters.clone());

    global_parameters
}

fn initialize_instruction(
    program_id: &solana_sdk::pubkey::Pubkey,
    payer_pubkey: &solana_sdk::pubkey::Pubkey,
    global_parameters: &solana_sdk::pubkey::Pubkey,
) -> solana_sdk::instruction::Instruction {
    let data = switchboard_solana::get_ixn_discriminator("initialize").to_vec();
    let accounts = vec![
        solana_sdk::instruction::AccountMeta::new(*payer_pubkey, true),
        solana_sdk::instruction::AccountMeta::new(*global_parameters, false),
        solana_sdk::instruction::AccountMeta::new(solana_program::system_program::ID, false),
        solana_sdk::instruction::AccountMeta::new_readonly(
            Pubkey::from_str("2vmviKfBkBu6m4gPMszrbdj1s3mLY3DpV8vRwo9XoBJa").unwrap(),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(*program_id, false),
    ];
    solana_sdk::instruction::Instruction {
        program_id: *program_id,
        accounts,
        data,
    }
}

fn buy_instruction(
    program_id: &solana_sdk::pubkey::Pubkey,
    global_parameters: &solana_sdk::pubkey::Pubkey,
    amm_pubkey: &solana_sdk::pubkey::Pubkey,
    base_pubkey: &solana_sdk::pubkey::Pubkey,
    quote_pubkey: &solana_sdk::pubkey::Pubkey,
    payer_pubkey: &solana_sdk::pubkey::Pubkey,
    base_amount: u64,
    max_quote_amount: u64,
) -> solana_sdk::instruction::Instruction {
    let mut data = switchboard_solana::get_ixn_discriminator("buy").to_vec();
    data.extend_from_slice(&base_amount.to_le_bytes());
    data.extend_from_slice(&max_quote_amount.to_le_bytes());
    // Construct the accounts required for the buy_instruction
    let accounts = vec![
        solana_sdk::instruction::AccountMeta::new(*amm_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(*global_parameters, false),
        solana_sdk::instruction::AccountMeta::new_readonly(*payer_pubkey, true),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &base_pubkey,
                &spl_token_2022::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &amm_pubkey,
                &base_pubkey,
                &spl_token_2022::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &amm_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(*base_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(*quote_pubkey, false),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token_2022::ID, false),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token::ID, false),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(
            Pubkey::from_str("2vmviKfBkBu6m4gPMszrbdj1s3mLY3DpV8vRwo9XoBJa").unwrap(),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(*program_id, false),
    ];
    // Create the instruction using the program_id, accounts, and data
    solana_sdk::instruction::Instruction {
        program_id: *program_id,
        accounts,
        data,
    }
}

pub fn add_liquidity_instruction(
    program_id: &solana_sdk::pubkey::Pubkey,
    amm_pubkey: &solana_sdk::pubkey::Pubkey,
    base_pubkey: &solana_sdk::pubkey::Pubkey,
    quote_pubkey: &solana_sdk::pubkey::Pubkey,
    payer_pubkey: &solana_sdk::pubkey::Pubkey,
    lp_mint_pubkey: &solana_sdk::pubkey::Pubkey,
    base_amount: u64,
    quote_amount: u64,
    min_liquidity: u64,
) -> solana_sdk::instruction::Instruction {
    let mut data = switchboard_solana::get_ixn_discriminator("add_liquidity").to_vec();
    data.extend_from_slice(&base_amount.to_le_bytes());
    data.extend_from_slice(&quote_amount.to_le_bytes());
    data.extend_from_slice(&min_liquidity.to_le_bytes());
    // Construct the accounts required for the add_liquidity_instruction
    let accounts = vec![
        solana_sdk::instruction::AccountMeta::new(*amm_pubkey, false),
        solana_sdk::instruction::AccountMeta::new_readonly(*payer_pubkey, true),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &base_pubkey,
                &spl_token_2022::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &amm_pubkey,
                &base_pubkey,
                &spl_token_2022::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &amm_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &lp_mint_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(*lp_mint_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(*base_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(*quote_pubkey, false),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token_2022::ID, false),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token::ID, false),
        solana_sdk::instruction::AccountMeta::new_readonly(
            solana_program::system_program::ID,
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(
            Pubkey::from_str("2vmviKfBkBu6m4gPMszrbdj1s3mLY3DpV8vRwo9XoBJa").unwrap(),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(*program_id, false),
    ];

    // Create the instruction using the program_id, accounts, and data
    solana_sdk::instruction::Instruction {
        program_id: *program_id,
        accounts,
        data,
    }
}

fn remove_liquidity_instruction(
    program_id: &solana_sdk::pubkey::Pubkey,
    amm_pubkey: &solana_sdk::pubkey::Pubkey,
    base_pubkey: &solana_sdk::pubkey::Pubkey,
    quote_pubkey: &solana_sdk::pubkey::Pubkey,
    payer_pubkey: &solana_sdk::pubkey::Pubkey,
    lp_mint_pubkey: &solana_sdk::pubkey::Pubkey,
    shares: u64,
    quote_min_amount: u64,
    base_min_amount: u64,
) -> solana_sdk::instruction::Instruction {
    let mut data = switchboard_solana::get_ixn_discriminator("remove_liquidity").to_vec();
    data.extend_from_slice(&shares.to_le_bytes());
    data.extend_from_slice(&quote_min_amount.to_le_bytes());
    data.extend_from_slice(&base_min_amount.to_le_bytes());
    // Construct the accounts required for the add_liquidity_instruction
    let accounts = vec![
        solana_sdk::instruction::AccountMeta::new(*amm_pubkey, false),
        solana_sdk::instruction::AccountMeta::new_readonly(*payer_pubkey, true),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &base_pubkey,
                &spl_token_2022::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &amm_pubkey,
                &base_pubkey,
                &spl_token_2022::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &amm_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &lp_mint_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(*lp_mint_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(*base_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(*quote_pubkey, false),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token_2022::ID, false),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token::ID, false),
        solana_sdk::instruction::AccountMeta::new_readonly(
            solana_program::system_program::ID,
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(
            Pubkey::from_str("2vmviKfBkBu6m4gPMszrbdj1s3mLY3DpV8vRwo9XoBJa").unwrap(),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(*program_id, false),
    ];
    // Create the instruction using the program_id, accounts, and data
    solana_sdk::instruction::Instruction {
        program_id: *program_id,
        accounts,
        data,
    }
}
fn sell_instruction(
    program_id: &solana_sdk::pubkey::Pubkey,
    global_parameters: &solana_sdk::pubkey::Pubkey,
    amm_pubkey: &solana_sdk::pubkey::Pubkey,
    payer_pubkey: &solana_sdk::pubkey::Pubkey,
    base_pubkey: &solana_sdk::pubkey::Pubkey,
    quote_pubkey: &solana_sdk::pubkey::Pubkey,
    base_amount: u64,
    min_quote_amount: u64,
) -> solana_sdk::instruction::Instruction {
    let mut data = switchboard_solana::get_ixn_discriminator("sell").to_vec();
    data.extend_from_slice(&base_amount.to_le_bytes());
    data.extend_from_slice(&min_quote_amount.to_le_bytes());

    // Construct the accounts required for the add_liquidity_instruction
    let accounts = vec![
        solana_sdk::instruction::AccountMeta::new(*amm_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(*global_parameters, false),
        solana_sdk::instruction::AccountMeta::new_readonly(*payer_pubkey, true),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &base_pubkey,
                &spl_token_2022::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &amm_pubkey,
                &base_pubkey,
                &spl_token_2022::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &amm_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new(*base_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(*quote_pubkey, false),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token_2022::ID, false),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token::ID, false),
        solana_sdk::instruction::AccountMeta::new(
            spl_associated_token_account::get_associated_token_address_with_program_id(
                &payer_pubkey,
                &quote_pubkey,
                &spl_token::ID,
            ),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(
            Pubkey::from_str("2vmviKfBkBu6m4gPMszrbdj1s3mLY3DpV8vRwo9XoBJa").unwrap(),
            false,
        ),
        solana_sdk::instruction::AccountMeta::new_readonly(*program_id, false),
    ];
    // Create the instruction using the program_id, accounts, and data
    solana_sdk::instruction::Instruction {
        program_id: *program_id,
        accounts,
        data,
    }
}

fn create_amm(
    state: &'bump AccountsState,
    admin: AccountInfo<'bump>,
    system_program: AccountInfo<'bump>,
    base_mint: AccountInfo<'bump>,
    quote_mint: AccountInfo<'bump>,
    global_parameters: AccountInfo<'bump>,
    lp_mint: AccountInfo<'bump>,
) -> solana_sdk::instruction::Instruction {

    let program_id = pump_v2_amm::id();
    let amm =
        state.new_owned_account(size_of::<Amm>(), program_id, Rent::free());
    pump_v2_amm::instructions::create(Context::new(
        &pump_v2_amm::id(),
        &mut create::Create {
        amm: Account::try_from(&amm).unwrap(),
        user: Signer::try_from(&admin).unwrap(),
        system_program: Program::try_from(&system_program).unwrap(),
        lp_mint: InterfaceAccount::try_from(&lp_mint).unwrap(),
        base_mint: InterfaceAccount::try_from(&base_mint).unwrap(),
        quote_mint: InterfaceAccount::try_from(&quote_mint).unwrap(),
        token_program: Program::try_from(&token_program).unwrap(),
        },
        &[],
        BTreeMap::new(),
    ))
    .unwrap();

    set_discriminator::<GlobalParameters>(global_parameters.clone());

    amm
}
#[cfg(test)]
mod tests {
    use fixed::types::I80F48;
    use marginfi::state::marginfi_account::RiskEngine;
    use pyth_sdk_solana::state::PriceAccount;

    use super::*;
    #[test]
    fn deposit_test() {
        let account_state = AccountsState::new();

        let a = MarginfiFuzzContext::setup(&account_state, &[BankAndOracleConfig::dummy(); 2], 2);

        let al =
            AccountLoader::<MarginfiGroup>::try_from_unchecked(&marginfi::id(), &a.marginfi_group)
                .unwrap();

        assert_eq!(al.load().unwrap().admin, a.owner.key());

        a.process_action_deposit(&AccountIdx(0), &BankIdx(0), &AssetAmount(1000))
            .unwrap();

        let marginfi_account_ai = AccountLoader::<MarginfiAccount>::try_from_unchecked(
            &marginfi::id(),
            &a.marginfi_accounts[0].margin_account,
        )
        .unwrap();
        let marginfi_account = marginfi_account_ai.load().unwrap();

        assert_eq!(
            I80F48::from(marginfi_account.lending_account.balances[0].asset_shares),
            I80F48!(1000)
        );
    }

    #[test]
    fn borrow_test() {
        let account_state = AccountsState::new();
        let a = MarginfiFuzzContext::setup(&account_state, &[BankAndOracleConfig::dummy(); 2], 2);

        a.process_action_deposit(&AccountIdx(1), &BankIdx(1), &AssetAmount(1000))
            .unwrap();
        a.process_action_deposit(&AccountIdx(0), &BankIdx(0), &AssetAmount(1000))
            .unwrap();
        a.process_action_borrow(&AccountIdx(0), &BankIdx(1), &AssetAmount(100))
            .unwrap();

        let marginfi_account_ai = AccountLoader::<MarginfiAccount>::try_from_unchecked(
            &marginfi::id(),
            &a.marginfi_accounts[0].margin_account,
        )
        .unwrap();

        {
            let marginfi_account = marginfi_account_ai.load().unwrap();

            assert_eq!(
                I80F48::from(marginfi_account.lending_account.balances[0].asset_shares),
                I80F48!(1000)
            );
            assert_eq!(
                I80F48::from(marginfi_account.lending_account.balances[1].liability_shares),
                I80F48!(100)
            );
        }

        a.process_action_repay(&AccountIdx(0), &BankIdx(1), &AssetAmount(100), false)
            .unwrap();

        let marginfi_account = marginfi_account_ai.load().unwrap();

        assert_eq!(
            I80F48::from(marginfi_account.lending_account.balances[1].liability_shares),
            I80F48!(0)
        );
    }

    #[test]
    fn liquidation_test() {
        let account_state = AccountsState::new();
        let a = MarginfiFuzzContext::setup(&account_state, &[BankAndOracleConfig::dummy(); 2], 3);

        a.process_action_deposit(&AccountIdx(1), &BankIdx(1), &AssetAmount(1000))
            .unwrap();
        a.process_action_deposit(&AccountIdx(0), &BankIdx(0), &AssetAmount(1000))
            .unwrap();
        a.process_action_borrow(&AccountIdx(0), &BankIdx(1), &AssetAmount(500))
            .unwrap();

        a.banks[1].log_oracle_price().unwrap();

        a.process_update_oracle(&BankIdx(1), &PriceChange(10000000000000))
            .unwrap();

        a.banks[1].log_oracle_price().unwrap();

        let marginfi_account_ai = AccountLoader::<MarginfiAccount>::try_from_unchecked(
            &marginfi::id(),
            &a.marginfi_accounts[0].margin_account,
        )
        .unwrap();

        {
            let marginfi_account = marginfi_account_ai.load().unwrap();
            let margin_account = &a.marginfi_accounts[0];
            let bank_map = a.get_bank_map();
            let remaining_accounts =
                &margin_account.get_remaining_accounts(&bank_map, vec![], vec![]);

            let re = RiskEngine::new(&marginfi_account, remaining_accounts).unwrap();

            let health = re
                .get_account_health(
                    marginfi::state::marginfi_account::RiskRequirementType::Maintenance,
                )
                .unwrap();

            println!("Health {health}");
        }

        a.process_action_deposit(&AccountIdx(2), &BankIdx(1), &AssetAmount(1000))
            .unwrap();

        a.process_liquidate_account(&AccountIdx(2), &AccountIdx(0), &AssetAmount(50))
            .unwrap();

        let marginfi_account_ai = AccountLoader::<MarginfiAccount>::try_from_unchecked(
            &marginfi::id(),
            &a.marginfi_accounts[0].margin_account,
        )
        .unwrap();

        let marginfi_account = marginfi_account_ai.load().unwrap();

        assert_eq!(
            I80F48::from(marginfi_account.lending_account.balances[0].asset_shares),
            I80F48!(950)
        );
    }

    #[test]
    fn liquidation_and_bankruptcy() {
        let account_state = AccountsState::new();

        let a = MarginfiFuzzContext::setup(&account_state, &[BankAndOracleConfig::dummy(); 2], 3);

        a.process_action_deposit(&AccountIdx(1), &BankIdx(1), &AssetAmount(1000))
            .unwrap();
        a.process_action_deposit(&AccountIdx(0), &BankIdx(0), &AssetAmount(1000))
            .unwrap();
        a.process_action_borrow(&AccountIdx(0), &BankIdx(1), &AssetAmount(500))
            .unwrap();

        a.process_update_oracle(&BankIdx(1), &PriceChange(1000000000000))
            .unwrap();

        let marginfi_account_ai = AccountLoader::<MarginfiAccount>::try_from_unchecked(
            &marginfi::id(),
            &a.marginfi_accounts[0].margin_account,
        )
        .unwrap();

        {
            let marginfi_account = marginfi_account_ai.load().unwrap();
            let margin_account = &a.marginfi_accounts[0];
            let bank_map = a.get_bank_map();
            let remaining_accounts =
                &margin_account.get_remaining_accounts(&bank_map, vec![], vec![]);

            let re = RiskEngine::new(&marginfi_account, remaining_accounts).unwrap();

            let health = re
                .get_account_health(
                    marginfi::state::marginfi_account::RiskRequirementType::Maintenance,
                )
                .unwrap();

            println!("Health {health}");
        }

        a.process_action_deposit(&AccountIdx(2), &BankIdx(1), &AssetAmount(1000))
            .unwrap();

        a.process_liquidate_account(&AccountIdx(2), &AccountIdx(0), &AssetAmount(1000))
            .unwrap();

        let marginfi_account_ai = AccountLoader::<MarginfiAccount>::try_from_unchecked(
            &marginfi::id(),
            &a.marginfi_accounts[0].margin_account,
        )
        .unwrap();

        let marginfi_account = marginfi_account_ai.load().unwrap();

        assert_eq!(
            I80F48::from(marginfi_account.lending_account.balances[0].asset_shares),
            I80F48!(0)
        );
        assert_eq!(
            I80F48::from(marginfi_account.lending_account.balances[0].liability_shares),
            I80F48!(0)
        );
    }

    #[test]
    fn price_update() {
        let account_state = AccountsState::new();

        let a = MarginfiFuzzContext::setup(&account_state, &[BankAndOracleConfig::dummy(); 2], 3);

        let price = {
            let data = a.banks[0].oracle.try_borrow_data().unwrap();
            let data = bytemuck::from_bytes::<PriceAccount>(&data);

            data.ema_price.val
        };

        a.process_update_oracle(&BankIdx(0), &PriceChange(1100))
            .unwrap();

        let new_price = {
            let data = a.banks[0].oracle.try_borrow_data().unwrap();
            let data = bytemuck::from_bytes::<PriceAccount>(&data);
            data.ema_price.val
        };

        assert_eq!(price, new_price - 1100);
    }
}
