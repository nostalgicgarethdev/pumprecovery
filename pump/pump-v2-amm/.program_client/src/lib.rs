// DO NOT EDIT - automatically generated file (except `use` statements inside the `*_instruction` module
pub mod pump_v2_amm_instruction {
    use trident_client::*;
    pub static PROGRAM_ID: Pubkey = Pubkey::new_from_array([
        182u8, 85u8, 238u8, 97u8, 135u8, 150u8, 243u8, 225u8, 80u8, 152u8, 14u8, 193u8, 165u8,
        253u8, 112u8, 93u8, 173u8, 144u8, 104u8, 44u8, 245u8, 246u8, 211u8, 43u8, 202u8, 228u8,
        149u8, 250u8, 1u8, 174u8, 85u8, 119u8,
    ]);
    pub async fn create(
        client: &Client,
        a_amm: Pubkey,
        a_user: Pubkey,
        a_system_program: Pubkey,
        a_lp_mint: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_token_program: Pubkey,
        signers: impl IntoIterator<Item = Keypair> + Send + 'static,
    ) -> Result<EncodedConfirmedTransactionWithStatusMeta, ClientError> {
        client
            .send_instruction(
                PROGRAM_ID,
                pump_v2_amm::instruction::Create {},
                pump_v2_amm::accounts::Create {
                    amm: a_amm,
                    user: a_user,
                    system_program: a_system_program,
                    lp_mint: a_lp_mint,
                    base_mint: a_base_mint,
                    quote_mint: a_quote_mint,
                    token_program: a_token_program,
                },
                signers,
            )
            .await
    }
    pub fn create_ix(
        a_amm: Pubkey,
        a_user: Pubkey,
        a_system_program: Pubkey,
        a_lp_mint: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_token_program: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            data: pump_v2_amm::instruction::Create {}.data(),
            accounts: pump_v2_amm::accounts::Create {
                amm: a_amm,
                user: a_user,
                system_program: a_system_program,
                lp_mint: a_lp_mint,
                base_mint: a_base_mint,
                quote_mint: a_quote_mint,
                token_program: a_token_program,
            }
            .to_account_metas(None),
        }
    }
    pub async fn add_liquidity(
        client: &Client,
        i_params: pump_v2_amm::instructions::add_liquidity::AddLiquidityParams,
        a_amm: Pubkey,
        a_user: Pubkey,
        a_user_base_ata: Pubkey,
        a_user_quote_ata: Pubkey,
        a_base_reserve_ata: Pubkey,
        a_quote_reserve_ata: Pubkey,
        a_user_lp_ata: Pubkey,
        a_lp_mint: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_base_token_program: Pubkey,
        a_quote_token_program: Pubkey,
        a_system_program: Pubkey,
        signers: impl IntoIterator<Item = Keypair> + Send + 'static,
    ) -> Result<EncodedConfirmedTransactionWithStatusMeta, ClientError> {
        client
            .send_instruction(
                PROGRAM_ID,
                pump_v2_amm::instruction::AddLiquidity { params: i_params },
                pump_v2_amm::accounts::AddLiquidity {
                    amm: a_amm,
                    user: a_user,
                    user_base_ata: a_user_base_ata,
                    user_quote_ata: a_user_quote_ata,
                    base_reserve_ata: a_base_reserve_ata,
                    quote_reserve_ata: a_quote_reserve_ata,
                    user_lp_ata: a_user_lp_ata,
                    lp_mint: a_lp_mint,
                    base_mint: a_base_mint,
                    quote_mint: a_quote_mint,
                    base_token_program: a_base_token_program,
                    quote_token_program: a_quote_token_program,
                    system_program: a_system_program,
                },
                signers,
            )
            .await
    }
    pub fn add_liquidity_ix(
        i_params: pump_v2_amm::instructions::add_liquidity::AddLiquidityParams,
        a_amm: Pubkey,
        a_user: Pubkey,
        a_user_base_ata: Pubkey,
        a_user_quote_ata: Pubkey,
        a_base_reserve_ata: Pubkey,
        a_quote_reserve_ata: Pubkey,
        a_user_lp_ata: Pubkey,
        a_lp_mint: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_base_token_program: Pubkey,
        a_quote_token_program: Pubkey,
        a_system_program: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            data: pump_v2_amm::instruction::AddLiquidity { params: i_params }.data(),
            accounts: pump_v2_amm::accounts::AddLiquidity {
                amm: a_amm,
                user: a_user,
                user_base_ata: a_user_base_ata,
                user_quote_ata: a_user_quote_ata,
                base_reserve_ata: a_base_reserve_ata,
                quote_reserve_ata: a_quote_reserve_ata,
                user_lp_ata: a_user_lp_ata,
                lp_mint: a_lp_mint,
                base_mint: a_base_mint,
                quote_mint: a_quote_mint,
                base_token_program: a_base_token_program,
                quote_token_program: a_quote_token_program,
                system_program: a_system_program,
            }
            .to_account_metas(None),
        }
    }
    pub async fn remove_liquidity(
        client: &Client,
        i_params: pump_v2_amm::instructions::remove_liquidity::RemoveLiquidityParams,
        a_amm: Pubkey,
        a_user: Pubkey,
        a_user_base_ata: Pubkey,
        a_user_quote_ata: Pubkey,
        a_base_reserve_ata: Pubkey,
        a_quote_reserve_ata: Pubkey,
        a_user_lp_ata: Pubkey,
        a_lp_mint: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_base_token_program: Pubkey,
        a_quote_token_program: Pubkey,
        a_system_program: Pubkey,
        signers: impl IntoIterator<Item = Keypair> + Send + 'static,
    ) -> Result<EncodedConfirmedTransactionWithStatusMeta, ClientError> {
        client
            .send_instruction(
                PROGRAM_ID,
                pump_v2_amm::instruction::RemoveLiquidity { params: i_params },
                pump_v2_amm::accounts::RemoveLiquidity {
                    amm: a_amm,
                    user: a_user,
                    user_base_ata: a_user_base_ata,
                    user_quote_ata: a_user_quote_ata,
                    base_reserve_ata: a_base_reserve_ata,
                    quote_reserve_ata: a_quote_reserve_ata,
                    user_lp_ata: a_user_lp_ata,
                    lp_mint: a_lp_mint,
                    base_mint: a_base_mint,
                    quote_mint: a_quote_mint,
                    base_token_program: a_base_token_program,
                    quote_token_program: a_quote_token_program,
                    system_program: a_system_program,
                },
                signers,
            )
            .await
    }
    pub fn remove_liquidity_ix(
        i_params: pump_v2_amm::instructions::remove_liquidity::RemoveLiquidityParams,
        a_amm: Pubkey,
        a_user: Pubkey,
        a_user_base_ata: Pubkey,
        a_user_quote_ata: Pubkey,
        a_base_reserve_ata: Pubkey,
        a_quote_reserve_ata: Pubkey,
        a_user_lp_ata: Pubkey,
        a_lp_mint: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_base_token_program: Pubkey,
        a_quote_token_program: Pubkey,
        a_system_program: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            data: pump_v2_amm::instruction::RemoveLiquidity { params: i_params }.data(),
            accounts: pump_v2_amm::accounts::RemoveLiquidity {
                amm: a_amm,
                user: a_user,
                user_base_ata: a_user_base_ata,
                user_quote_ata: a_user_quote_ata,
                base_reserve_ata: a_base_reserve_ata,
                quote_reserve_ata: a_quote_reserve_ata,
                user_lp_ata: a_user_lp_ata,
                lp_mint: a_lp_mint,
                base_mint: a_base_mint,
                quote_mint: a_quote_mint,
                base_token_program: a_base_token_program,
                quote_token_program: a_quote_token_program,
                system_program: a_system_program,
            }
            .to_account_metas(None),
        }
    }
    pub async fn initialize(
        client: &Client,
        a_admin: Pubkey,
        a_global_parameters: Pubkey,
        a_system_program: Pubkey,
        signers: impl IntoIterator<Item = Keypair> + Send + 'static,
    ) -> Result<EncodedConfirmedTransactionWithStatusMeta, ClientError> {
        client
            .send_instruction(
                PROGRAM_ID,
                pump_v2_amm::instruction::Initialize {},
                pump_v2_amm::accounts::Initialize {
                    admin: a_admin,
                    global_parameters: a_global_parameters,
                    system_program: a_system_program,
                },
                signers,
            )
            .await
    }
    pub fn initialize_ix(
        a_admin: Pubkey,
        a_global_parameters: Pubkey,
        a_system_program: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            data: pump_v2_amm::instruction::Initialize {}.data(),
            accounts: pump_v2_amm::accounts::Initialize {
                admin: a_admin,
                global_parameters: a_global_parameters,
                system_program: a_system_program,
            }
            .to_account_metas(None),
        }
    }
    pub async fn buy(
        client: &Client,
        i_params: pump_v2_amm::instructions::buy::BuyParams,
        a_amm: Pubkey,
        a_global_parameters: Pubkey,
        a_user: Pubkey,
        a_user_base_ata: Pubkey,
        a_user_quote_ata: Pubkey,
        a_base_reserve_ata: Pubkey,
        a_quote_reserve_ata: Pubkey,
        a_fee_receiver_ata: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_base_token_program: Pubkey,
        a_quote_token_program: Pubkey,
        a_referral_ata: Pubkey,
        signers: impl IntoIterator<Item = Keypair> + Send + 'static,
    ) -> Result<EncodedConfirmedTransactionWithStatusMeta, ClientError> {
        client
            .send_instruction(
                PROGRAM_ID,
                pump_v2_amm::instruction::Buy { params: i_params },
                pump_v2_amm::accounts::Buy {
                    amm: a_amm,
                    global_parameters: a_global_parameters,
                    user: a_user,
                    user_base_ata: a_user_base_ata,
                    user_quote_ata: a_user_quote_ata,
                    base_reserve_ata: a_base_reserve_ata,
                    quote_reserve_ata: a_quote_reserve_ata,
                    fee_receiver_ata: a_fee_receiver_ata,
                    base_mint: a_base_mint,
                    quote_mint: a_quote_mint,
                    base_token_program: a_base_token_program,
                    quote_token_program: a_quote_token_program,
                    referral_ata: a_referral_ata,
                },
                signers,
            )
            .await
    }
    pub fn buy_ix(
        i_params: pump_v2_amm::instructions::buy::BuyParams,
        a_amm: Pubkey,
        a_global_parameters: Pubkey,
        a_user: Pubkey,
        a_user_base_ata: Pubkey,
        a_user_quote_ata: Pubkey,
        a_base_reserve_ata: Pubkey,
        a_quote_reserve_ata: Pubkey,
        a_fee_receiver_ata: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_base_token_program: Pubkey,
        a_quote_token_program: Pubkey,
        a_referral_ata: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            data: pump_v2_amm::instruction::Buy { params: i_params }.data(),
            accounts: pump_v2_amm::accounts::Buy {
                amm: a_amm,
                global_parameters: a_global_parameters,
                user: a_user,
                user_base_ata: a_user_base_ata,
                user_quote_ata: a_user_quote_ata,
                base_reserve_ata: a_base_reserve_ata,
                quote_reserve_ata: a_quote_reserve_ata,
                fee_receiver_ata: a_fee_receiver_ata,
                base_mint: a_base_mint,
                quote_mint: a_quote_mint,
                base_token_program: a_base_token_program,
                quote_token_program: a_quote_token_program,
                referral_ata: a_referral_ata,
            }
            .to_account_metas(None),
        }
    }
    pub async fn sell(
        client: &Client,
        i_params: pump_v2_amm::instructions::sell::SellParams,
        a_amm: Pubkey,
        a_global_parameters: Pubkey,
        a_user: Pubkey,
        a_user_base_ata: Pubkey,
        a_user_quote_ata: Pubkey,
        a_base_reserve_ata: Pubkey,
        a_quote_reserve_ata: Pubkey,
        a_fee_receiver_ata: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_base_token_program: Pubkey,
        a_quote_token_program: Pubkey,
        a_referral_ata: Pubkey,
        signers: impl IntoIterator<Item = Keypair> + Send + 'static,
    ) -> Result<EncodedConfirmedTransactionWithStatusMeta, ClientError> {
        client
            .send_instruction(
                PROGRAM_ID,
                pump_v2_amm::instruction::Sell { params: i_params },
                pump_v2_amm::accounts::Sell {
                    amm: a_amm,
                    global_parameters: a_global_parameters,
                    user: a_user,
                    user_base_ata: a_user_base_ata,
                    user_quote_ata: a_user_quote_ata,
                    base_reserve_ata: a_base_reserve_ata,
                    quote_reserve_ata: a_quote_reserve_ata,
                    fee_receiver_ata: a_fee_receiver_ata,
                    base_mint: a_base_mint,
                    quote_mint: a_quote_mint,
                    base_token_program: a_base_token_program,
                    quote_token_program: a_quote_token_program,
                    referral_ata: a_referral_ata,
                },
                signers,
            )
            .await
    }
    pub fn sell_ix(
        i_params: pump_v2_amm::instructions::sell::SellParams,
        a_amm: Pubkey,
        a_global_parameters: Pubkey,
        a_user: Pubkey,
        a_user_base_ata: Pubkey,
        a_user_quote_ata: Pubkey,
        a_base_reserve_ata: Pubkey,
        a_quote_reserve_ata: Pubkey,
        a_fee_receiver_ata: Pubkey,
        a_base_mint: Pubkey,
        a_quote_mint: Pubkey,
        a_base_token_program: Pubkey,
        a_quote_token_program: Pubkey,
        a_referral_ata: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            data: pump_v2_amm::instruction::Sell { params: i_params }.data(),
            accounts: pump_v2_amm::accounts::Sell {
                amm: a_amm,
                global_parameters: a_global_parameters,
                user: a_user,
                user_base_ata: a_user_base_ata,
                user_quote_ata: a_user_quote_ata,
                base_reserve_ata: a_base_reserve_ata,
                quote_reserve_ata: a_quote_reserve_ata,
                fee_receiver_ata: a_fee_receiver_ata,
                base_mint: a_base_mint,
                quote_mint: a_quote_mint,
                base_token_program: a_base_token_program,
                quote_token_program: a_quote_token_program,
                referral_ata: a_referral_ata,
            }
            .to_account_metas(None),
        }
    }
    pub async fn set_parameters(
        client: &Client,
        i_params: pump_v2_amm::instructions::set_parameters::SetParametersParams,
        a_global_parameters: Pubkey,
        a_admin: Pubkey,
        a_fee_recipient: Pubkey,
        signers: impl IntoIterator<Item = Keypair> + Send + 'static,
    ) -> Result<EncodedConfirmedTransactionWithStatusMeta, ClientError> {
        client
            .send_instruction(
                PROGRAM_ID,
                pump_v2_amm::instruction::SetParameters { params: i_params },
                pump_v2_amm::accounts::SetParameters {
                    global_parameters: a_global_parameters,
                    admin: a_admin,
                    fee_recipient: a_fee_recipient,
                },
                signers,
            )
            .await
    }
    pub fn set_parameters_ix(
        i_params: pump_v2_amm::instructions::set_parameters::SetParametersParams,
        a_global_parameters: Pubkey,
        a_admin: Pubkey,
        a_fee_recipient: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            data: pump_v2_amm::instruction::SetParameters { params: i_params }.data(),
            accounts: pump_v2_amm::accounts::SetParameters {
                global_parameters: a_global_parameters,
                admin: a_admin,
                fee_recipient: a_fee_recipient,
            }
            .to_account_metas(None),
        }
    }
}
