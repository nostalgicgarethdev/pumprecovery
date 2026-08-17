use pump_v2_amm::ID as PROGRAM_ID;
use trident_client::anchor_lang::{self, prelude::*};
use trident_client::fuzzing::FuzzingError;
pub struct CreateSnapshot<'info> {
    pub amm: Option<Account<'info, pump_v2_amm::state::Amm>>,
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub lp_mint: Option<InterfaceAccount<'info, anchor_spl::token_interface::Mint>>,
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub token_program: Program<'info, Token>,
}
pub struct AddLiquiditySnapshot<'info> {
    pub amm: Account<'info, pump_v2_amm::state::Amm>,
    pub user: Signer<'info>,
    pub user_base_ata: &'info AccountInfo<'info>,
    pub user_quote_ata: &'info AccountInfo<'info>,
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub user_lp_ata: &'info AccountInfo<'info>,
    pub lp_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: &'info AccountInfo<'info>,
    pub quote_token_program: &'info AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
pub struct RemoveLiquiditySnapshot<'info> {
    pub amm: Account<'info, pump_v2_amm::state::Amm>,
    pub user: Signer<'info>,
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub user_lp_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub lp_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub system_program: Program<'info, System>,
}
pub struct InitializeSnapshot<'info> {
    pub admin: Signer<'info>,
    pub global_parameters: Option<Account<'info, pump_v2_amm::state::GlobalParameters>>,
    pub system_program: Program<'info, System>,
}
pub struct BuySnapshot<'info> {
    pub amm: Account<'info, pump_v2_amm::state::Amm>,
    pub global_parameters: Account<'info, pump_v2_amm::state::GlobalParameters>,
    pub user: Signer<'info>,
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub fee_receiver_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub referral_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
}
pub struct SellSnapshot<'info> {
    pub amm: Account<'info, pump_v2_amm::state::Amm>,
    pub global_parameters: Account<'info, pump_v2_amm::state::GlobalParameters>,
    pub user: Signer<'info>,
    pub user_base_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub user_quote_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub base_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub quote_reserve_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub fee_receiver_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    pub base_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub quote_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
    pub base_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub quote_token_program: Interface<'info, anchor_spl::token_interface::TokenInterface>,
    pub referral_ata: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
}
pub struct SetParametersSnapshot<'info> {
    pub global_parameters: Account<'info, pump_v2_amm::state::GlobalParameters>,
    pub admin: Signer<'info>,
    pub fee_recipient: &'info AccountInfo<'info>,
}
impl<'info> CreateSnapshot<'info> {
    pub fn deserialize_option(
        accounts: &'info mut [Option<AccountInfo<'info>>],
    ) -> core::result::Result<Self, FuzzingError> {
        let mut accounts_iter = accounts.iter();
        let amm: Option<anchor_lang::accounts::account::Account<pump_v2_amm::state::Amm>> =
            accounts_iter
                .next()
                .ok_or(FuzzingError::NotEnoughAccounts("amm".to_string()))?
                .as_ref()
                .map(|acc| {
                    if acc.key() != PROGRAM_ID {
                        anchor_lang::accounts::account::Account::try_from(acc)
                            .map_err(|_| FuzzingError::CannotDeserializeAccount("amm".to_string()))
                    } else {
                        Err(FuzzingError::OptionalAccountNotProvided("amm".to_string()))
                    }
                })
                .transpose()
                .unwrap_or(None);
        let user: Signer<'_> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::signer::Signer::try_from)
            .ok_or(FuzzingError::AccountNotFound("user".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user".to_string()))?;
        let system_program: anchor_lang::accounts::program::Program<System> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "system_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::program::Program::try_from)
            .ok_or(FuzzingError::AccountNotFound("system_program".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("system_program".to_string()))?;
        let lp_mint: Option<
            anchor_lang::accounts::interface_account::InterfaceAccount<
                anchor_spl::token_interface::Mint,
            >,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("lp_mint".to_string()))?
            .as_ref()
            .map(|acc| {
                if acc.key() != PROGRAM_ID {
                    anchor_lang::accounts::interface_account::InterfaceAccount::try_from(acc)
                        .map_err(|_| FuzzingError::CannotDeserializeAccount("lp_mint".to_string()))
                } else {
                    Err(FuzzingError::OptionalAccountNotProvided(
                        "lp_mint".to_string(),
                    ))
                }
            })
            .transpose()
            .unwrap_or(None);
        let base_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("base_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("base_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_mint".to_string()))?;
        let quote_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("quote_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("quote_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_mint".to_string()))?;
        let token_program: anchor_lang::accounts::program::Program<Token> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("token_program".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::program::Program::try_from)
            .ok_or(FuzzingError::AccountNotFound("token_program".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("token_program".to_string()))?;
        Ok(Self {
            amm,
            user,
            system_program,
            lp_mint,
            base_mint,
            quote_mint,
            token_program,
        })
    }
}
impl<'info> AddLiquiditySnapshot<'info> {
    pub fn deserialize_option(
        accounts: &'info mut [Option<AccountInfo<'info>>],
    ) -> core::result::Result<Self, FuzzingError> {
        let mut accounts_iter = accounts.iter();
        let amm: anchor_lang::accounts::account::Account<pump_v2_amm::state::Amm> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("amm".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::account::Account::try_from)
            .ok_or(FuzzingError::AccountNotFound("amm".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("amm".to_string()))?;
        let user: Signer<'_> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::signer::Signer::try_from)
            .ok_or(FuzzingError::AccountNotFound("user".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user".to_string()))?;
        let user_base_ata = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user_base_ata".to_string()))?
            .as_ref()
            .ok_or(FuzzingError::AccountNotFound("user_base_ata".to_string()))?;
        let user_quote_ata = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "user_quote_ata".to_string(),
            ))?
            .as_ref()
            .ok_or(FuzzingError::AccountNotFound("user_quote_ata".to_string()))?;
        let base_reserve_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "base_reserve_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "base_reserve_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_reserve_ata".to_string()))?;
        let quote_reserve_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "quote_reserve_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "quote_reserve_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_reserve_ata".to_string()))?;
        let user_lp_ata = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user_lp_ata".to_string()))?
            .as_ref()
            .ok_or(FuzzingError::AccountNotFound("user_lp_ata".to_string()))?;
        let lp_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("lp_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("lp_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("lp_mint".to_string()))?;
        let base_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("base_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("base_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_mint".to_string()))?;
        let quote_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("quote_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("quote_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_mint".to_string()))?;
        let base_token_program = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "base_token_program".to_string(),
            ))?
            .as_ref()
            .ok_or(FuzzingError::AccountNotFound(
                "base_token_program".to_string(),
            ))?;
        let quote_token_program = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "quote_token_program".to_string(),
            ))?
            .as_ref()
            .ok_or(FuzzingError::AccountNotFound(
                "quote_token_program".to_string(),
            ))?;
        let system_program: anchor_lang::accounts::program::Program<System> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "system_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::program::Program::try_from)
            .ok_or(FuzzingError::AccountNotFound("system_program".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("system_program".to_string()))?;
        Ok(Self {
            amm,
            user,
            user_base_ata,
            user_quote_ata,
            base_reserve_ata,
            quote_reserve_ata,
            user_lp_ata,
            lp_mint,
            base_mint,
            quote_mint,
            base_token_program,
            quote_token_program,
            system_program,
        })
    }
}
impl<'info> RemoveLiquiditySnapshot<'info> {
    pub fn deserialize_option(
        accounts: &'info mut [Option<AccountInfo<'info>>],
    ) -> core::result::Result<Self, FuzzingError> {
        let mut accounts_iter = accounts.iter();
        let amm: anchor_lang::accounts::account::Account<pump_v2_amm::state::Amm> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("amm".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::account::Account::try_from)
            .ok_or(FuzzingError::AccountNotFound("amm".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("amm".to_string()))?;
        let user: Signer<'_> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::signer::Signer::try_from)
            .ok_or(FuzzingError::AccountNotFound("user".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user".to_string()))?;
        let user_base_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user_base_ata".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("user_base_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user_base_ata".to_string()))?;
        let user_quote_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "user_quote_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("user_quote_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user_quote_ata".to_string()))?;
        let base_reserve_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "base_reserve_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "base_reserve_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_reserve_ata".to_string()))?;
        let quote_reserve_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "quote_reserve_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "quote_reserve_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_reserve_ata".to_string()))?;
        let user_lp_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user_lp_ata".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("user_lp_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user_lp_ata".to_string()))?;
        let lp_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("lp_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("lp_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("lp_mint".to_string()))?;
        let base_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("base_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("base_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_mint".to_string()))?;
        let quote_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("quote_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("quote_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_mint".to_string()))?;
        let base_token_program: anchor_lang::accounts::interface::Interface<
            anchor_spl::token_interface::TokenInterface,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "base_token_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface::Interface::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "base_token_program".to_string(),
            ))?
            .map_err(|_| {
                FuzzingError::CannotDeserializeAccount("base_token_program".to_string())
            })?;
        let quote_token_program: anchor_lang::accounts::interface::Interface<
            anchor_spl::token_interface::TokenInterface,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "quote_token_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface::Interface::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "quote_token_program".to_string(),
            ))?
            .map_err(|_| {
                FuzzingError::CannotDeserializeAccount("quote_token_program".to_string())
            })?;
        let system_program: anchor_lang::accounts::program::Program<System> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "system_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::program::Program::try_from)
            .ok_or(FuzzingError::AccountNotFound("system_program".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("system_program".to_string()))?;
        Ok(Self {
            amm,
            user,
            user_base_ata,
            user_quote_ata,
            base_reserve_ata,
            quote_reserve_ata,
            user_lp_ata,
            lp_mint,
            base_mint,
            quote_mint,
            base_token_program,
            quote_token_program,
            system_program,
        })
    }
}
impl<'info> InitializeSnapshot<'info> {
    pub fn deserialize_option(
        accounts: &'info mut [Option<AccountInfo<'info>>],
    ) -> core::result::Result<Self, FuzzingError> {
        let mut accounts_iter = accounts.iter();
        let admin: Signer<'_> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("admin".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::signer::Signer::try_from)
            .ok_or(FuzzingError::AccountNotFound("admin".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("admin".to_string()))?;
        let global_parameters: Option<
            anchor_lang::accounts::account::Account<pump_v2_amm::state::GlobalParameters>,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "global_parameters".to_string(),
            ))?
            .as_ref()
            .map(|acc| {
                if acc.key() != PROGRAM_ID {
                    anchor_lang::accounts::account::Account::try_from(acc).map_err(|_| {
                        FuzzingError::CannotDeserializeAccount("global_parameters".to_string())
                    })
                } else {
                    Err(FuzzingError::OptionalAccountNotProvided(
                        "global_parameters".to_string(),
                    ))
                }
            })
            .transpose()
            .unwrap_or(None);
        let system_program: anchor_lang::accounts::program::Program<System> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "system_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::program::Program::try_from)
            .ok_or(FuzzingError::AccountNotFound("system_program".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("system_program".to_string()))?;
        Ok(Self {
            admin,
            global_parameters,
            system_program,
        })
    }
}
impl<'info> BuySnapshot<'info> {
    pub fn deserialize_option(
        accounts: &'info mut [Option<AccountInfo<'info>>],
    ) -> core::result::Result<Self, FuzzingError> {
        let mut accounts_iter = accounts.iter();
        let amm: anchor_lang::accounts::account::Account<pump_v2_amm::state::Amm> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("amm".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::account::Account::try_from)
            .ok_or(FuzzingError::AccountNotFound("amm".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("amm".to_string()))?;
        let global_parameters: anchor_lang::accounts::account::Account<
            pump_v2_amm::state::GlobalParameters,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "global_parameters".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::account::Account::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "global_parameters".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("global_parameters".to_string()))?;
        let user: Signer<'_> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::signer::Signer::try_from)
            .ok_or(FuzzingError::AccountNotFound("user".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user".to_string()))?;
        let user_base_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user_base_ata".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("user_base_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user_base_ata".to_string()))?;
        let user_quote_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "user_quote_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("user_quote_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user_quote_ata".to_string()))?;
        let base_reserve_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "base_reserve_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "base_reserve_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_reserve_ata".to_string()))?;
        let quote_reserve_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "quote_reserve_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "quote_reserve_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_reserve_ata".to_string()))?;
        let fee_receiver_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "fee_receiver_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "fee_receiver_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("fee_receiver_ata".to_string()))?;
        let base_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("base_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("base_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_mint".to_string()))?;
        let quote_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("quote_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("quote_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_mint".to_string()))?;
        let base_token_program: anchor_lang::accounts::interface::Interface<
            anchor_spl::token_interface::TokenInterface,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "base_token_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface::Interface::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "base_token_program".to_string(),
            ))?
            .map_err(|_| {
                FuzzingError::CannotDeserializeAccount("base_token_program".to_string())
            })?;
        let quote_token_program: anchor_lang::accounts::interface::Interface<
            anchor_spl::token_interface::TokenInterface,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "quote_token_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface::Interface::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "quote_token_program".to_string(),
            ))?
            .map_err(|_| {
                FuzzingError::CannotDeserializeAccount("quote_token_program".to_string())
            })?;
        let referral_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("referral_ata".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("referral_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("referral_ata".to_string()))?;
        Ok(Self {
            amm,
            global_parameters,
            user,
            user_base_ata,
            user_quote_ata,
            base_reserve_ata,
            quote_reserve_ata,
            fee_receiver_ata,
            base_mint,
            quote_mint,
            base_token_program,
            quote_token_program,
            referral_ata,
        })
    }
}
impl<'info> SellSnapshot<'info> {
    pub fn deserialize_option(
        accounts: &'info mut [Option<AccountInfo<'info>>],
    ) -> core::result::Result<Self, FuzzingError> {
        let mut accounts_iter = accounts.iter();
        let amm: anchor_lang::accounts::account::Account<pump_v2_amm::state::Amm> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("amm".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::account::Account::try_from)
            .ok_or(FuzzingError::AccountNotFound("amm".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("amm".to_string()))?;
        let global_parameters: anchor_lang::accounts::account::Account<
            pump_v2_amm::state::GlobalParameters,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "global_parameters".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::account::Account::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "global_parameters".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("global_parameters".to_string()))?;
        let user: Signer<'_> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::signer::Signer::try_from)
            .ok_or(FuzzingError::AccountNotFound("user".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user".to_string()))?;
        let user_base_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("user_base_ata".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("user_base_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user_base_ata".to_string()))?;
        let user_quote_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "user_quote_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("user_quote_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("user_quote_ata".to_string()))?;
        let base_reserve_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "base_reserve_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "base_reserve_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_reserve_ata".to_string()))?;
        let quote_reserve_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "quote_reserve_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "quote_reserve_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_reserve_ata".to_string()))?;
        let fee_receiver_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "fee_receiver_ata".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "fee_receiver_ata".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("fee_receiver_ata".to_string()))?;
        let base_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("base_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("base_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("base_mint".to_string()))?;
        let quote_mint: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::Mint,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("quote_mint".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("quote_mint".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("quote_mint".to_string()))?;
        let base_token_program: anchor_lang::accounts::interface::Interface<
            anchor_spl::token_interface::TokenInterface,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "base_token_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface::Interface::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "base_token_program".to_string(),
            ))?
            .map_err(|_| {
                FuzzingError::CannotDeserializeAccount("base_token_program".to_string())
            })?;
        let quote_token_program: anchor_lang::accounts::interface::Interface<
            anchor_spl::token_interface::TokenInterface,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "quote_token_program".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::interface::Interface::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "quote_token_program".to_string(),
            ))?
            .map_err(|_| {
                FuzzingError::CannotDeserializeAccount("quote_token_program".to_string())
            })?;
        let referral_ata: anchor_lang::accounts::interface_account::InterfaceAccount<
            anchor_spl::token_interface::TokenAccount,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("referral_ata".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::interface_account::InterfaceAccount::try_from)
            .ok_or(FuzzingError::AccountNotFound("referral_ata".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("referral_ata".to_string()))?;
        Ok(Self {
            amm,
            global_parameters,
            user,
            user_base_ata,
            user_quote_ata,
            base_reserve_ata,
            quote_reserve_ata,
            fee_receiver_ata,
            base_mint,
            quote_mint,
            base_token_program,
            quote_token_program,
            referral_ata,
        })
    }
}
impl<'info> SetParametersSnapshot<'info> {
    pub fn deserialize_option(
        accounts: &'info mut [Option<AccountInfo<'info>>],
    ) -> core::result::Result<Self, FuzzingError> {
        let mut accounts_iter = accounts.iter();
        let global_parameters: anchor_lang::accounts::account::Account<
            pump_v2_amm::state::GlobalParameters,
        > = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts(
                "global_parameters".to_string(),
            ))?
            .as_ref()
            .map(anchor_lang::accounts::account::Account::try_from)
            .ok_or(FuzzingError::AccountNotFound(
                "global_parameters".to_string(),
            ))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("global_parameters".to_string()))?;
        let admin: Signer<'_> = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("admin".to_string()))?
            .as_ref()
            .map(anchor_lang::accounts::signer::Signer::try_from)
            .ok_or(FuzzingError::AccountNotFound("admin".to_string()))?
            .map_err(|_| FuzzingError::CannotDeserializeAccount("admin".to_string()))?;
        let fee_recipient = accounts_iter
            .next()
            .ok_or(FuzzingError::NotEnoughAccounts("fee_recipient".to_string()))?
            .as_ref()
            .ok_or(FuzzingError::AccountNotFound("fee_recipient".to_string()))?;
        Ok(Self {
            global_parameters,
            admin,
            fee_recipient,
        })
    }
}
