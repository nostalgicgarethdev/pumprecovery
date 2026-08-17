pub mod pump_v2_amm_fuzz_instructions {
    use crate::accounts_snapshots::*;
    use trident_client::fuzzing::*;
    #[derive(Arbitrary, DisplayIx, FuzzTestExecutor, FuzzDeserialize)]
    pub enum FuzzInstruction {
        Create(Create),
        AddLiquidity(AddLiquidity),
        RemoveLiquidity(RemoveLiquidity),
        Initialize(Initialize),
        Buy(Buy),
        Sell(Sell),
        SetParameters(SetParameters),
    }
    #[derive(Arbitrary, Debug)]
    pub struct Create {
        pub accounts: CreateAccounts,
        pub data: CreateData,
    }
    #[derive(Arbitrary, Debug)]
    pub struct CreateAccounts {
        pub amm: AccountId,
        pub user: AccountId,
        pub system_program: AccountId,
        pub lp_mint: AccountId,
        pub base_mint: AccountId,
        pub quote_mint: AccountId,
        pub token_program: AccountId,
    }
    #[derive(Arbitrary, Debug)]
    pub struct CreateData {}
    #[derive(Arbitrary, Debug)]
    pub struct AddLiquidity {
        pub accounts: AddLiquidityAccounts,
        pub data: AddLiquidityData,
    }
    #[derive(Arbitrary, Debug)]
    pub struct AddLiquidityAccounts {
        pub amm: AccountId,
        pub user: AccountId,
        pub user_base_ata: AccountId,
        pub user_quote_ata: AccountId,
        pub base_reserve_ata: AccountId,
        pub quote_reserve_ata: AccountId,
        pub user_lp_ata: AccountId,
        pub lp_mint: AccountId,
        pub base_mint: AccountId,
        pub quote_mint: AccountId,
        pub base_token_program: AccountId,
        pub quote_token_program: AccountId,
        pub system_program: AccountId,
    }
    #[derive(Arbitrary, Debug)]
    pub struct AddLiquidityData {
        pub params: pump_v2_amm::instructions::add_liquidity::AddLiquidityParams,
    }
    #[derive(Arbitrary, Debug)]
    pub struct RemoveLiquidity {
        pub accounts: RemoveLiquidityAccounts,
        pub data: RemoveLiquidityData,
    }
    #[derive(Arbitrary, Debug)]
    pub struct RemoveLiquidityAccounts {
        pub amm: AccountId,
        pub user: AccountId,
        pub user_base_ata: AccountId,
        pub user_quote_ata: AccountId,
        pub base_reserve_ata: AccountId,
        pub quote_reserve_ata: AccountId,
        pub user_lp_ata: AccountId,
        pub lp_mint: AccountId,
        pub base_mint: AccountId,
        pub quote_mint: AccountId,
        pub base_token_program: AccountId,
        pub quote_token_program: AccountId,
        pub system_program: AccountId,
    }
    #[derive(Arbitrary, Debug)]
    pub struct RemoveLiquidityData {
        pub params: pump_v2_amm::instructions::remove_liquidity::RemoveLiquidityParams,
    }
    #[derive(Arbitrary, Debug)]
    pub struct Initialize {
        pub accounts: InitializeAccounts,
        pub data: InitializeData,
    }
    #[derive(Arbitrary, Debug)]
    pub struct InitializeAccounts {
        pub admin: AccountId,
        pub global_parameters: AccountId,
        pub system_program: AccountId,
    }
    #[derive(Arbitrary, Debug)]
    pub struct InitializeData {}
    #[derive(Arbitrary, Debug)]
    pub struct Buy {
        pub accounts: BuyAccounts,
        pub data: BuyData,
    }
    #[derive(Arbitrary, Debug)]
    pub struct BuyAccounts {
        pub amm: AccountId,
        pub global_parameters: AccountId,
        pub user: AccountId,
        pub user_base_ata: AccountId,
        pub user_quote_ata: AccountId,
        pub base_reserve_ata: AccountId,
        pub quote_reserve_ata: AccountId,
        pub fee_receiver_ata: AccountId,
        pub base_mint: AccountId,
        pub quote_mint: AccountId,
        pub base_token_program: AccountId,
        pub quote_token_program: AccountId,
        pub referral_ata: AccountId,
    }
    #[derive(Arbitrary, Debug)]
    pub struct BuyData {
        pub params: pump_v2_amm::instructions::buy::BuyParams,
    }
    #[derive(Arbitrary, Debug)]
    pub struct Sell {
        pub accounts: SellAccounts,
        pub data: SellData,
    }
    #[derive(Arbitrary, Debug)]
    pub struct SellAccounts {
        pub amm: AccountId,
        pub global_parameters: AccountId,
        pub user: AccountId,
        pub user_base_ata: AccountId,
        pub user_quote_ata: AccountId,
        pub base_reserve_ata: AccountId,
        pub quote_reserve_ata: AccountId,
        pub fee_receiver_ata: AccountId,
        pub base_mint: AccountId,
        pub quote_mint: AccountId,
        pub base_token_program: AccountId,
        pub quote_token_program: AccountId,
        pub referral_ata: AccountId,
    }
    #[derive(Arbitrary, Debug)]
    pub struct SellData {
        pub params: pump_v2_amm::instructions::sell::SellParams,
    }
    #[derive(Arbitrary, Debug)]
    pub struct SetParameters {
        pub accounts: SetParametersAccounts,
        pub data: SetParametersData,
    }
    #[derive(Arbitrary, Debug)]
    pub struct SetParametersAccounts {
        pub global_parameters: AccountId,
        pub admin: AccountId,
        pub fee_recipient: AccountId,
    }
    #[derive(Arbitrary, Debug)]
    pub struct SetParametersData {
        pub params: pump_v2_amm::instructions::set_parameters::SetParametersParams,
    }
    impl<'info> IxOps<'info> for Create {
        type IxData = pump_v2_amm::instruction::Create;
        type IxAccounts = FuzzAccounts;
        type IxSnapshot = CreateSnapshot<'info>;
        fn get_data(
            &self,
            _client: &mut impl FuzzClient,
            _fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<Self::IxData, FuzzingError> {
            let data = pump_v2_amm::instruction::Create {};
            Ok(data)
        }
        fn get_accounts(
            &self,
            client: &mut impl FuzzClient,
            fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<(Vec<Keypair>, Vec<AccountMeta>), FuzzingError> {
            let signers = vec![todo!()];
            let acc_meta = pump_v2_amm::accounts::Create {
                amm: todo!(),
                user: todo!(),
                system_program: todo!(),
                lp_mint: todo!(),
                base_mint: todo!(),
                quote_mint: todo!(),
                token_program: todo!(),
            }
            .to_account_metas(None);
            Ok((signers, acc_meta))
        }
    }
    impl<'info> IxOps<'info> for AddLiquidity {
        type IxData = pump_v2_amm::instruction::AddLiquidity;
        type IxAccounts = FuzzAccounts;
        type IxSnapshot = AddLiquiditySnapshot<'info>;
        fn get_data(
            &self,
            _client: &mut impl FuzzClient,
            _fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<Self::IxData, FuzzingError> {
            let data = pump_v2_amm::instruction::AddLiquidity { params: todo!() };
            Ok(data)
        }
        fn get_accounts(
            &self,
            client: &mut impl FuzzClient,
            fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<(Vec<Keypair>, Vec<AccountMeta>), FuzzingError> {
            let signers = vec![todo!()];
            let acc_meta = pump_v2_amm::accounts::AddLiquidity {
                amm: todo!(),
                user: todo!(),
                user_base_ata: todo!(),
                user_quote_ata: todo!(),
                base_reserve_ata: todo!(),
                quote_reserve_ata: todo!(),
                user_lp_ata: todo!(),
                lp_mint: todo!(),
                base_mint: todo!(),
                quote_mint: todo!(),
                base_token_program: todo!(),
                quote_token_program: todo!(),
                system_program: todo!(),
            }
            .to_account_metas(None);
            Ok((signers, acc_meta))
        }
    }
    impl<'info> IxOps<'info> for RemoveLiquidity {
        type IxData = pump_v2_amm::instruction::RemoveLiquidity;
        type IxAccounts = FuzzAccounts;
        type IxSnapshot = RemoveLiquiditySnapshot<'info>;
        fn get_data(
            &self,
            _client: &mut impl FuzzClient,
            _fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<Self::IxData, FuzzingError> {
            let data = pump_v2_amm::instruction::RemoveLiquidity { params: todo!() };
            Ok(data)
        }
        fn get_accounts(
            &self,
            client: &mut impl FuzzClient,
            fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<(Vec<Keypair>, Vec<AccountMeta>), FuzzingError> {
            let signers = vec![todo!()];
            let acc_meta = pump_v2_amm::accounts::RemoveLiquidity {
                amm: todo!(),
                user: todo!(),
                user_base_ata: todo!(),
                user_quote_ata: todo!(),
                base_reserve_ata: todo!(),
                quote_reserve_ata: todo!(),
                user_lp_ata: todo!(),
                lp_mint: todo!(),
                base_mint: todo!(),
                quote_mint: todo!(),
                base_token_program: todo!(),
                quote_token_program: todo!(),
                system_program: todo!(),
            }
            .to_account_metas(None);
            Ok((signers, acc_meta))
        }
    }
    impl<'info> IxOps<'info> for Initialize {
        type IxData = pump_v2_amm::instruction::Initialize;
        type IxAccounts = FuzzAccounts;
        type IxSnapshot = InitializeSnapshot<'info>;
        fn get_data(
            &self,
            _client: &mut impl FuzzClient,
            _fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<Self::IxData, FuzzingError> {
            let data = pump_v2_amm::instruction::Initialize {};
            Ok(data)
        }
        fn get_accounts(
            &self,
            client: &mut impl FuzzClient,
            fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<(Vec<Keypair>, Vec<AccountMeta>), FuzzingError> {
            let signers = vec![todo!()];
            let acc_meta = pump_v2_amm::accounts::Initialize {
                admin: todo!(),
                global_parameters: todo!(),
                system_program: todo!(),
            }
            .to_account_metas(None);
            Ok((signers, acc_meta))
        }
    }
    impl<'info> IxOps<'info> for Buy {
        type IxData = pump_v2_amm::instruction::Buy;
        type IxAccounts = FuzzAccounts;
        type IxSnapshot = BuySnapshot<'info>;
        fn get_data(
            &self,
            _client: &mut impl FuzzClient,
            _fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<Self::IxData, FuzzingError> {
            let data = pump_v2_amm::instruction::Buy { params: todo!() };
            Ok(data)
        }
        fn get_accounts(
            &self,
            client: &mut impl FuzzClient,
            fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<(Vec<Keypair>, Vec<AccountMeta>), FuzzingError> {
            let signers = vec![todo!()];
            let acc_meta = pump_v2_amm::accounts::Buy {
                amm: todo!(),
                global_parameters: todo!(),
                user: todo!(),
                user_base_ata: todo!(),
                user_quote_ata: todo!(),
                base_reserve_ata: todo!(),
                quote_reserve_ata: todo!(),
                fee_receiver_ata: todo!(),
                base_mint: todo!(),
                quote_mint: todo!(),
                base_token_program: todo!(),
                quote_token_program: todo!(),
                referral_ata: todo!(),
            }
            .to_account_metas(None);
            Ok((signers, acc_meta))
        }
    }
    impl<'info> IxOps<'info> for Sell {
        type IxData = pump_v2_amm::instruction::Sell;
        type IxAccounts = FuzzAccounts;
        type IxSnapshot = SellSnapshot<'info>;
        fn get_data(
            &self,
            _client: &mut impl FuzzClient,
            _fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<Self::IxData, FuzzingError> {
            let data = pump_v2_amm::instruction::Sell { params: todo!() };
            Ok(data)
        }
        fn get_accounts(
            &self,
            client: &mut impl FuzzClient,
            fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<(Vec<Keypair>, Vec<AccountMeta>), FuzzingError> {
            let signers = vec![todo!()];
            let acc_meta = pump_v2_amm::accounts::Sell {
                amm: todo!(),
                global_parameters: todo!(),
                user: todo!(),
                user_base_ata: todo!(),
                user_quote_ata: todo!(),
                base_reserve_ata: todo!(),
                quote_reserve_ata: todo!(),
                fee_receiver_ata: todo!(),
                base_mint: todo!(),
                quote_mint: todo!(),
                base_token_program: todo!(),
                quote_token_program: todo!(),
                referral_ata: todo!(),
            }
            .to_account_metas(None);
            Ok((signers, acc_meta))
        }
    }
    impl<'info> IxOps<'info> for SetParameters {
        type IxData = pump_v2_amm::instruction::SetParameters;
        type IxAccounts = FuzzAccounts;
        type IxSnapshot = SetParametersSnapshot<'info>;
        fn get_data(
            &self,
            _client: &mut impl FuzzClient,
            _fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<Self::IxData, FuzzingError> {
            let data = pump_v2_amm::instruction::SetParameters { params: todo!() };
            Ok(data)
        }
        fn get_accounts(
            &self,
            client: &mut impl FuzzClient,
            fuzz_accounts: &mut FuzzAccounts,
        ) -> Result<(Vec<Keypair>, Vec<AccountMeta>), FuzzingError> {
            let signers = vec![todo!()];
            let acc_meta = pump_v2_amm::accounts::SetParameters {
                global_parameters: todo!(),
                admin: todo!(),
                fee_recipient: todo!(),
            }
            .to_account_metas(None);
            Ok((signers, acc_meta))
        }
    }
    #[doc = r" Use AccountsStorage<T> where T can be one of:"]
    #[doc = r" Keypair, PdaStore, TokenStore, MintStore, ProgramStore"]
    #[derive(Default)]
    pub struct FuzzAccounts {
        admin: AccountsStorage<todo!()>,
        amm: AccountsStorage<todo!()>,
        base_mint: AccountsStorage<todo!()>,
        base_reserve_ata: AccountsStorage<todo!()>,
        base_token_program: AccountsStorage<todo!()>,
        fee_receiver_ata: AccountsStorage<todo!()>,
        fee_recipient: AccountsStorage<todo!()>,
        global_parameters: AccountsStorage<todo!()>,
        lp_mint: AccountsStorage<todo!()>,
        quote_mint: AccountsStorage<todo!()>,
        quote_reserve_ata: AccountsStorage<todo!()>,
        quote_token_program: AccountsStorage<todo!()>,
        referral_ata: AccountsStorage<todo!()>,
        system_program: AccountsStorage<todo!()>,
        token_program: AccountsStorage<todo!()>,
        user: AccountsStorage<todo!()>,
        user_base_ata: AccountsStorage<todo!()>,
        user_lp_ata: AccountsStorage<todo!()>,
        user_quote_ata: AccountsStorage<todo!()>,
    }
}
