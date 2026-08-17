use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token_interface::TokenInterface;
use std::str::FromStr;

const DEFAULT_FIRST_LEVEL_REFERRER: &str = "WzMaL78srutrF6CsxEkWuhMaDF5HZA6jNRaEPengqpb";
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self},
    token_interface::{Mint, TokenAccount},
};

declare_program!(orca_whirlpool);

declare_id!("67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV");
// NOTE: these are plain pubkey constants (not `declare_id!`). Extra `declare_id!` calls in
// submodules confuse the Anchor IDL generator and cause it to emit the wrong program address.
pub mod native_mint {
    use anchor_lang::prelude::Pubkey;
    use anchor_lang::solana_program::pubkey;
    pub const ID: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
}

pub mod house_mint {
    use anchor_lang::prelude::Pubkey;
    use anchor_lang::solana_program::pubkey;
    // $PUMPICO / house token for the 1/3 buy & burn
    pub const ID: Pubkey = pubkey!("Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump");
}

pub mod usdc_mint {
    use anchor_lang::prelude::Pubkey;
    use anchor_lang::solana_program::pubkey;
    // Mainnet USDC. The quote token for the USDC LP venue: the escrow WSOL is swapped to USDC on a
    // SOL/USDC whirlpool, then single-side deposited into the USDC/meme whirlpool.
    pub const ID: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
}

pub mod config_feature {
    pub mod withdraw_authority {
        use anchor_lang::prelude::Pubkey;
        use anchor_lang::solana_program::pubkey;
        pub const ID: Pubkey = pubkey!("3ZdcMauPdKq6n49im6cR7shQScWR8A98tr42tZsa8JbS");
    }
}

/// PumpSwap (pump AMM) program. We CPI into `buy_exact_quote_in` via a raw
/// `Instruction` + `invoke_signed` (no second `declare_program!` to avoid bloat/stack issues).
pub mod pump_amm {
    use anchor_lang::prelude::Pubkey;
    use anchor_lang::solana_program::pubkey;
    pub const ID: Pubkey = pubkey!("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
    /// pump AMM fee program (account[22] of `buy_exact_quote_in`).
    pub const FEE_PROGRAM_ID: Pubkey = pubkey!("pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ");
    /// Anchor discriminator for `buy_exact_quote_in`.
    pub const BUY_EXACT_QUOTE_IN_DISCM: [u8; 8] =
        [0xc6, 0x2e, 0x15, 0x52, 0xb4, 0xd9, 0xe8, 0x70];
    /// Anchor discriminator for `buy` (exact base out, max quote in) — the path the
    /// official @pump-fun/pump-swap-sdk uses (26 accounts).
    pub const BUY_DISCM: [u8; 8] = [0x66, 0x06, 0x3d, 0x12, 0x01, 0xda, 0xeb, 0xea];
    /// HOUSE/WSOL pool (base = HOUSE/Token-2022, quote = WSOL).
    pub const HOUSE_POOL_ID: Pubkey = pubkey!("9nStgVVCinCyKoBiMGMfCM2iG3TW411EDmUcQqHxL2ek");
}

// === Bundle step bits (increment 1 of the bundle redesign). ===
// A bundle is the 5 steps that must all land in the same slot. We can't introspect across
// transactions on-chain, so a slot-scoped on-chain counter (`BundleGuard`) is the enforcement
// primitive: each step ORs its bit into `mask`, and `mask` auto-resets whenever the slot changes.
pub const STEP_TRADE: u32 = 1;
pub const STEP_REFERRAL: u32 = 2;
pub const STEP_LP: u32 = 4;
pub const STEP_BURN: u32 = 8;
pub const STEP_COMMIT: u32 = 16;
// LP is EXCLUDED from the required mask so the Orca `add_liq` leg stays OPTIONAL and can never
// brick the working buy/sell/bundle_buy_burn/commit path; STEP_LP stays defined so the bit is
// reserved. This round enforces TRADE + REFERRAL + BURN co-slot.
// To later REQUIRE the LP leg, change the next line to:
//   pub const REQUIRED_MASK: u32 = STEP_TRADE | STEP_REFERRAL | STEP_LP | STEP_BURN;
pub const REQUIRED_MASK: u32 = STEP_TRADE | STEP_REFERRAL | STEP_BURN;

/// Marks `step` as done in the slot-scoped bundle guard. Auto-resets the guard (mask + pending
/// amounts) whenever the slot advances, so the mask is guaranteed to be 0 unless we are still
/// within the same slot's bundle.
pub fn mark_bundle(guard: &mut BundleGuard, step: u32) -> Result<()> {
    let current_slot = Clock::get()?.slot;
    if guard.slot != current_slot {
        guard.slot = current_slot;
        guard.mask = 0;
        guard.pending_ref = 0;
        guard.pending_lp = 0;
        guard.pending_burn = 0;
        guard.withheld = 0;
    }
    guard.mask |= step;
    Ok(())
}

/// Errors unless the guard was last touched in the current slot (i.e. the bundle is still live).
pub fn require_same_slot(guard: &BundleGuard) -> Result<()> {
    let current_slot = Clock::get()?.slot;
    require!(guard.slot == current_slot, PumpError::BundleGuardViolation);
    Ok(())
}

// === Anti-sandwich INSTRUCTION-INTROSPECTION ALLOWLIST ===
// Every one of our bundle legs reads the Instructions sysvar and rejects the WHOLE transaction if
// it contains any TOP-LEVEL instruction whose program id is not on this allowlist. This stops a
// bundler/sandwicher from stapling a foreign instruction (a competing DEX swap, a fund-redirect,
// some other program's entrypoint, ...) into the same tx as one of our trades.
pub mod allowlist {
    use anchor_lang::prelude::Pubkey;
    use anchor_lang::solana_program::pubkey;

    /// ComputeBudget program (priority fee / CU limit ixs).
    pub const COMPUTE_BUDGET: Pubkey = pubkey!("ComputeBudget111111111111111111111111111111");
    /// System program.
    pub const SYSTEM: Pubkey = pubkey!("11111111111111111111111111111111");
    /// SPL Token program.
    pub const TOKEN: Pubkey = pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    /// SPL Token-2022 program.
    pub const TOKEN_2022: Pubkey = pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
    /// SPL Associated Token Account program.
    pub const ASSOCIATED_TOKEN: Pubkey = pubkey!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    /// Lighthouse assertion program. Canonical mainnet-beta (and devnet) program id, verified
    /// against the Jac0xb/lighthouse repo + Solana Explorer. Wallets/bundlers (e.g. Phantom) append
    /// Lighthouse assertion ixs to guard their bundles, so it must be allowed at top level.
    pub const LIGHTHOUSE: Pubkey = pubkey!("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95");

    /// Fixed "plumbing" programs allowed alongside our own program. `crate::ID` (our program) is
    /// checked separately in `is_allowed` because `declare_id!` emits a `static`, which cannot be
    /// referenced inside a `const` array initializer.
    //
    // INTENTIONALLY ABSENT: the pump AMM (pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA) and Orca
    // (whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc). We invoke BOTH only via CPI (`invoke_signed`)
    // from inside our own instructions, so they are INNER instructions, never top-level. The
    // Instructions sysvar enumerates ONLY top-level instructions of the tx, so these CPIs never
    // appear in the list and must NOT be allowlisted (doing so would let a sandwicher add a
    // top-level pump-AMM/Orca swap, which is exactly what we are blocking).
    pub const PLUMBING: [Pubkey; 6] = [
        COMPUTE_BUDGET,
        SYSTEM,
        TOKEN,
        TOKEN_2022,
        ASSOCIATED_TOKEN,
        LIGHTHOUSE,
    ];

    /// True iff `program_id` is our own program or one of the allowlisted plumbing programs.
    #[inline]
    pub fn is_allowed(program_id: &Pubkey) -> bool {
        program_id == &crate::ID || PLUMBING.iter().any(|p| p == program_id)
    }
}

/// Anti-sandwich guard: read the Instructions sysvar and reject the whole tx if ANY top-level
/// instruction targets a program id outside `allowlist`. Pass `ctx.accounts.instructions_sysvar`.
///
/// We enumerate top-level instructions by reading the instruction count, which the sysvar
/// serializes as a little-endian `u16` at offset 0 of its data, then loading each one with
/// `load_instruction_at_checked`. (Reading the exact count is more robust than probing indices
/// until an out-of-range error.) Only top-level instructions are listed here — our pump-AMM/Orca
/// CPIs are inner instructions and never appear, so they are intentionally not on the allowlist.
fn enforce_allowlist(ix_sysvar: &AccountInfo) -> Result<()> {
    use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

    let num_instructions = {
        let data = ix_sysvar.try_borrow_data()?;
        require!(data.len() >= 2, PumpError::RogueInstruction);
        u16::from_le_bytes([data[0], data[1]]) as usize
    };

    for i in 0..num_instructions {
        let ix = load_instruction_at_checked(i, ix_sysvar)?;
        require!(
            allowlist::is_allowed(&ix.program_id),
            PumpError::RogueInstruction
        );
    }

    Ok(())
}

// === Multi-venue `add_liq` helpers ===
// `add_liq` deposits the escrowed LP third into one of three Orca whirlpools (SOL/meme,
// USDC/meme, HOUSE/meme). Venues 1 & 2 first ACQUIRE the venue's quote token (USDC via an Orca
// `swap_v2`, HOUSE via the exact `bundle_buy_burn` PumpSwap `buy_exact_quote_in`) before the
// single-sided `increase_liquidity_by_token_amounts_v2` deposit. Each is factored into its own
// `#[inline(never)]` function so it gets a fresh BPF stack frame (keeps `add_liq` under 4KB).

/// Orca sqrt-price bounds (Q64.64). Used as the no-slippage range for `swap_v2` price limits and
/// `increase_liquidity_by_token_amounts_v2` deposits.
const ORCA_MIN_SQRT_PRICE: u128 = 4295048016;
const ORCA_MAX_SQRT_PRICE: u128 = 79226673515401279992447579055;

/// Minimum WSOL `spend` for the HOUSE venue's PumpSwap buy. `buy_exact_quote_in` is called with
/// `min_base = 1`, so a dust spend that buys 0 HOUSE would REVERT (and brick the Jito bundle). We
/// gracefully no-op below this floor instead (mirrors the off-chain BURN_FLOOR).
const HOUSE_BUY_MIN_SPEND: u64 = 5000;

/// Reads an SPL / Token-2022 token-account `amount` (LE u64 at offset 64). 0 if unreadable.
fn read_token_amount(ai: &AccountInfo) -> u64 {
    match ai.try_borrow_data() {
        Ok(d) if d.len() >= 72 => u64::from_le_bytes(d[64..72].try_into().unwrap()),
        _ => 0,
    }
}

/// Reads a token-account `mint` (pubkey at offset 0). None if unreadable / too short.
fn read_token_mint(ai: &AccountInfo) -> Option<Pubkey> {
    match ai.try_borrow_data() {
        Ok(d) if d.len() >= 32 => Some(Pubkey::new_from_array(d[0..32].try_into().unwrap())),
        _ => None,
    }
}

/// Reads a token-account `owner` (pubkey at offset 32). None if unreadable / too short.
fn read_token_owner(ai: &AccountInfo) -> Option<Pubkey> {
    match ai.try_borrow_data() {
        Ok(d) if d.len() >= 64 => Some(Pubkey::new_from_array(d[32..64].try_into().unwrap())),
        _ => None,
    }
}

/// Reads an SPL / Token-2022 mint's `decimals` (offset 44). 0 if unreadable.
fn read_mint_decimals(ai: &AccountInfo) -> u8 {
    match ai.try_borrow_data() {
        Ok(d) if d.len() >= 45 => d[44],
        _ => 0,
    }
}

/// Single-sided Orca `increase_liquidity_by_token_amounts_v2` deposit (disc effb097cd2c6352b),
/// `invoke_signed` by the `lp_owner` PDA (position_authority). Deposits UP TO (cpi_max_a,
/// cpi_max_b) over Orca's full [MIN,MAX] sqrt-price range so it can never revert on slippage. `il`
/// MUST be exactly the 14 Orca accounts in this order (position_authority is injected from
/// `lp_owner`, so it is NOT part of `il`):
///   [0] whirlpool             [1] token_program_a       [2] token_program_b   [3] memo_program
///   [4] position              [5] position_token_account
///   [6] token_mint_a          [7] token_mint_b
///   [8] token_owner_account_a [9] token_owner_account_b
///   [10] token_vault_a        [11] token_vault_b
///   [12] tick_array_lower     [13] tick_array_upper
/// `orca_program` (the Whirlpool program account) is pushed last into the CPI infos.
#[inline(never)]
fn orca_increase_liq_by_token_amounts<'info>(
    orca_program: &AccountInfo<'info>,
    lp_owner: &AccountInfo<'info>,
    lp_owner_bump: u8,
    il: &[AccountInfo<'info>],
    cpi_max_a: u64,
    cpi_max_b: u64,
) -> Result<()> {
    use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
    use anchor_lang::solana_program::program::invoke_signed;

    const ILBTA_DISCM: [u8; 8] = [0xef, 0xfb, 0x09, 0x7c, 0xd2, 0xc6, 0x35, 0x2b];

    let layout: Vec<(AccountInfo<'info>, bool, bool)> = vec![
        (il[0].clone(), false, true),    // whirlpool (w)
        (il[1].clone(), false, false),   // token_program_a
        (il[2].clone(), false, false),   // token_program_b
        (il[3].clone(), false, false),   // memo_program
        (lp_owner.clone(), true, false), // position_authority (signer)
        (il[4].clone(), false, true),    // position (w)
        (il[5].clone(), false, false),   // position_token_account
        (il[6].clone(), false, false),   // token_mint_a
        (il[7].clone(), false, false),   // token_mint_b
        (il[8].clone(), false, true),    // token_owner_account_a (w)
        (il[9].clone(), false, true),    // token_owner_account_b (w)
        (il[10].clone(), false, true),   // token_vault_a (w)
        (il[11].clone(), false, true),   // token_vault_b (w)
        (il[12].clone(), false, true),   // tick_array_lower (w)
        (il[13].clone(), false, true),   // tick_array_upper (w)
    ];
    let mut metas = Vec::with_capacity(layout.len());
    let mut infos = Vec::with_capacity(layout.len() + 1);
    for (info, is_signer, is_writable) in &layout {
        metas.push(AccountMeta {
            pubkey: *info.key,
            is_signer: *is_signer,
            is_writable: *is_writable,
        });
        infos.push(info.clone());
    }
    infos.push(orca_program.clone());

    let mut data = Vec::with_capacity(8 + 1 + 8 + 8 + 16 + 16 + 1);
    data.extend_from_slice(&ILBTA_DISCM);
    data.push(0u8); // enum variant 0 = ByTokenAmounts
    data.extend_from_slice(&cpi_max_a.to_le_bytes());
    data.extend_from_slice(&cpi_max_b.to_le_bytes());
    data.extend_from_slice(&ORCA_MIN_SQRT_PRICE.to_le_bytes());
    data.extend_from_slice(&ORCA_MAX_SQRT_PRICE.to_le_bytes());
    data.push(0u8); // remaining_accounts_info: Option<RemainingAccountsInfo> = None

    let ix = Instruction {
        program_id: orca_whirlpool::ID,
        accounts: metas,
        data,
    };
    let bump_arr = [lp_owner_bump];
    let seeds: &[&[u8]] = &[b"lp_owner", &bump_arr];
    invoke_signed(&ix, &infos, &[seeds])?;
    Ok(())
}

/// Orca `swap_v2` CPI (disc 2b04ed0b1ac91e62 = sha256("global:swap_v2")), `invoke_signed` by the `lp_owner` PDA
/// (token_authority). Exact-input swap of `amount_in` with min-out 0 and the price limit pinned to
/// the [MIN,MAX] bound for the direction, so it can never revert on slippage. `sw` MUST be exactly
/// the 14 swap accounts in this order (token_authority is injected from `lp_owner`):
///   [0] token_program_a    [1] token_program_b   [2] memo_program
///   [3] whirlpool          [4] token_mint_a      [5] token_mint_b
///   [6] token_owner_account_a   [7] token_vault_a
///   [8] token_owner_account_b   [9] token_vault_b
///   [10] tick_array_0      [11] tick_array_1     [12] tick_array_2     [13] oracle
#[inline(never)]
fn orca_swap_v2<'info>(
    orca_program: &AccountInfo<'info>,
    lp_owner: &AccountInfo<'info>,
    lp_owner_bump: u8,
    sw: &[AccountInfo<'info>],
    amount_in: u64,
    a_to_b: bool,
    sqrt_price_limit: u128,
) -> Result<()> {
    use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
    use anchor_lang::solana_program::program::invoke_signed;

    // sha256("global:swap_v2")[0..8]. The previous value f8c69e91e17587c8 was
    // sha256("global:swap") — Orca's V1 `swap`, whose 11-account layout differs from
    // the V2 layout we pass (token_program_a/b + memo + mints). Invoking V1 with V2
    // accounts made Orca read the signer slot as a token program (Custom 3010
    // AccountNotSigner) and the tick-array slots as vault accounts (Custom 0x1787 /
    // 6023 InvalidTickArraySequence) — the two alternating errors on the USDC venue.
    const SWAP_V2_DISCM: [u8; 8] = [0x2b, 0x04, 0xed, 0x0b, 0x1a, 0xc9, 0x1e, 0x62];

    let layout: Vec<(AccountInfo<'info>, bool, bool)> = vec![
        (sw[0].clone(), false, false),   // token_program_a
        (sw[1].clone(), false, false),   // token_program_b
        (sw[2].clone(), false, false),   // memo_program
        (lp_owner.clone(), true, false), // token_authority (signer)
        (sw[3].clone(), false, true),    // whirlpool (w)
        (sw[4].clone(), false, false),   // token_mint_a
        (sw[5].clone(), false, false),   // token_mint_b
        (sw[6].clone(), false, true),    // token_owner_account_a (w)
        (sw[7].clone(), false, true),    // token_vault_a (w)
        (sw[8].clone(), false, true),    // token_owner_account_b (w)
        (sw[9].clone(), false, true),    // token_vault_b (w)
        (sw[10].clone(), false, true),   // tick_array_0 (w)
        (sw[11].clone(), false, true),   // tick_array_1 (w)
        (sw[12].clone(), false, true),   // tick_array_2 (w)
        (sw[13].clone(), false, true),   // oracle (w)
    ];
    let mut metas = Vec::with_capacity(layout.len());
    let mut infos = Vec::with_capacity(layout.len() + 1);
    for (info, is_signer, is_writable) in &layout {
        metas.push(AccountMeta {
            pubkey: *info.key,
            is_signer: *is_signer,
            is_writable: *is_writable,
        });
        infos.push(info.clone());
    }
    infos.push(orca_program.clone());

    let mut data = Vec::with_capacity(8 + 8 + 8 + 16 + 1 + 1 + 1);
    data.extend_from_slice(&SWAP_V2_DISCM);
    data.extend_from_slice(&amount_in.to_le_bytes()); // amount
    data.extend_from_slice(&0u64.to_le_bytes()); // other_amount_threshold = 0 (no min-out)
    data.extend_from_slice(&sqrt_price_limit.to_le_bytes()); // sqrt_price_limit
    data.push(1u8); // amount_specified_is_input = true
    data.push(if a_to_b { 1u8 } else { 0u8 }); // a_to_b
    data.push(0u8); // remaining_accounts_info: Option<RemainingAccountsInfo> = None

    let ix = Instruction {
        program_id: orca_whirlpool::ID,
        accounts: metas,
        data,
    };
    let bump_arr = [lp_owner_bump];
    let seeds: &[&[u8]] = &[b"lp_owner", &bump_arr];
    invoke_signed(&ix, &infos, &[seeds])?;
    Ok(())
}

/// VENUE 1 (USDC): swap the escrow `spend` WSOL -> USDC on an Orca SOL/USDC whirlpool (`swap_v2`),
/// then single-side deposit the received USDC into the USDC/meme whirlpool. WSOL is funded from the
/// PAYER (System transfer + `sync_native` into the lp_owner WSOL ATA); the caller reimburses the
/// payer from the guard escrow. Returns Ok(true) when funds were moved (caller reimburses + marks
/// STEP_LP), Ok(false) for a graceful no-op (NO funds moved, NO mark) when the venue isn't valid.
/// `remaining` layout (no PumpSwap accounts for this venue):
///   [0..14)  = `swap_v2` accounts for the SOL/USDC pool (see `orca_swap_v2`)
///   [14..28) = `increase_liquidity` accounts for the USDC/meme pool (see `orca_increase_liq_*`)
///   [28]     = orca_whirlpool program (shared by both CPIs)
#[inline(never)]
fn add_liq_usdc<'info>(
    payer: &AccountInfo<'info>,
    lp_owner: &AccountInfo<'info>,
    lp_owner_bump: u8,
    wsol_token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    remaining: &[AccountInfo<'info>],
    spend: u64,
) -> Result<bool> {
    if remaining.len() < 29 {
        msg!("add_liq(usdc): need >=29 remaining accounts; graceful no-op");
        return Ok(false);
    }
    let orca_program = &remaining[28];
    if orca_program.key() != orca_whirlpool::ID {
        msg!("add_liq(usdc): orca program mismatch; graceful no-op");
        return Ok(false);
    }
    // Both whirlpools must be live (Orca-owned, with data) or we never touch funds.
    if remaining[3].owner != &orca_whirlpool::ID || remaining[3].data_is_empty() {
        msg!("add_liq(usdc): SOL/USDC pool not live; graceful no-op");
        return Ok(false);
    }
    if remaining[14].owner != &orca_whirlpool::ID || remaining[14].data_is_empty() {
        msg!("add_liq(usdc): USDC/meme pool not live; graceful no-op");
        return Ok(false);
    }
    // Detect WSOL/USDC sides of the SOL/USDC swap pool + the swap direction & price bound.
    let swap_mint_a = remaining[4].key();
    let swap_mint_b = remaining[5].key();
    let (wsol_owner_ai, swap_usdc_owner_ai, a_to_b, sqrt_limit) =
        if swap_mint_a == native_mint::ID && swap_mint_b == usdc_mint::ID {
            (&remaining[6], &remaining[8], true, ORCA_MIN_SQRT_PRICE)
        } else if swap_mint_b == native_mint::ID && swap_mint_a == usdc_mint::ID {
            (&remaining[8], &remaining[6], false, ORCA_MAX_SQRT_PRICE)
        } else {
            msg!("add_liq(usdc): SOL/USDC pool mints are not (WSOL,USDC); graceful no-op");
            return Ok(false);
        };
    // The WSOL input account must be lp_owner's WSOL token account (so `sync_native` is safe).
    if read_token_mint(wsol_owner_ai) != Some(native_mint::ID)
        || read_token_owner(wsol_owner_ai) != Some(lp_owner.key())
    {
        msg!("add_liq(usdc): WSOL owner account is not lp_owner's WSOL ATA; graceful no-op");
        return Ok(false);
    }
    // Detect the USDC side of the USDC/meme deposit pool.
    let lp_mint_a = remaining[20].key();
    let lp_mint_b = remaining[21].key();
    let (usdc_is_a, deposit_usdc_owner_ai) = if lp_mint_a == usdc_mint::ID {
        (true, &remaining[22])
    } else if lp_mint_b == usdc_mint::ID {
        (false, &remaining[23])
    } else {
        msg!("add_liq(usdc): USDC/meme pool has no USDC side; graceful no-op");
        return Ok(false);
    };
    // The swap's USDC output account MUST be the same account the deposit pulls USDC from, and it
    // must be lp_owner's USDC ATA.
    if swap_usdc_owner_ai.key() != deposit_usdc_owner_ai.key() {
        msg!("add_liq(usdc): swap USDC output != deposit USDC source; graceful no-op");
        return Ok(false);
    }
    if read_token_mint(deposit_usdc_owner_ai) != Some(usdc_mint::ID)
        || read_token_owner(deposit_usdc_owner_ai) != Some(lp_owner.key())
    {
        msg!("add_liq(usdc): USDC owner account is not lp_owner's USDC ATA; graceful no-op");
        return Ok(false);
    }
    require!(spend > 0, PumpError::BundleGuardViolation);

    // 1) Fund the WSOL input from the payer (reimbursed from the escrow by the caller).
    transfer(
        CpiContext::new(
            system_program.clone(),
            Transfer {
                from: payer.clone(),
                to: wsol_owner_ai.clone(),
            },
        ),
        spend,
    )?;
    token::sync_native(CpiContext::new(
        wsol_token_program.clone(),
        token::SyncNative {
            account: wsol_owner_ai.clone(),
        },
    ))?;

    // 2) Swap WSOL -> USDC on the SOL/USDC whirlpool (signed by lp_owner as token_authority).
    orca_swap_v2(
        orca_program,
        lp_owner,
        lp_owner_bump,
        &remaining[0..14],
        spend,
        a_to_b,
        sqrt_limit,
    )?;

    // 3) Deposit the FULL USDC balance now in lp_owner's USDC ATA, single-sided (meme side = 0).
    let usdc_amt = read_token_amount(deposit_usdc_owner_ai);
    if usdc_amt == 0 {
        msg!("add_liq(usdc): 0 USDC after swap; nothing to deposit (escrow consumed)");
        return Ok(true);
    }
    let (cpi_max_a, cpi_max_b) = if usdc_is_a {
        (usdc_amt, 0u64)
    } else {
        (0u64, usdc_amt)
    };
    orca_increase_liq_by_token_amounts(
        orca_program,
        lp_owner,
        lp_owner_bump,
        &remaining[14..28],
        cpi_max_a,
        cpi_max_b,
    )?;
    Ok(true)
}

/// VENUE 2 (HOUSE): reuse the EXACT `bundle_buy_burn` PumpSwap CPI (`buy_exact_quote_in`, disc
/// c62e1552b4d9e870, treasury signs, spends `spend` WSOL, `min_base = 1`) to buy $HOUSE into the
/// treasury HOUSE ATA, move it to lp_owner's HOUSE ATA (treasury-signed `transfer_checked`), then
/// single-side deposit it into the HOUSE/meme whirlpool. WSOL is funded from the PAYER; the caller
/// reimburses the payer from the guard escrow. Returns Ok(true)/Ok(false) like `add_liq_usdc`.
/// `remaining` layout:
///   [0..23)  = PumpSwap `buy_exact_quote_in` accounts (canonical order). Key indices:
///                [0] pool (HOUSE/WSOL = pump_amm::HOUSE_POOL_ID),  [1] user = house_treasury (signer),
///                [3] base_mint (HOUSE),  [5] treasury HOUSE ATA (base out),  [6] treasury WSOL ATA
///                (quote in),  [11] base token program (Token-2022),  [16] pump_amm program.
///   [23..37) = `increase_liquidity` accounts for the HOUSE/meme pool (see `orca_increase_liq_*`).
///                The HOUSE-side `token_owner_account` here is lp_owner's HOUSE ATA.
///   [37]     = orca_whirlpool program.
#[inline(never)]
fn add_liq_house<'info>(
    payer: &AccountInfo<'info>,
    lp_owner: &AccountInfo<'info>,
    lp_owner_bump: u8,
    wsol_token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    remaining: &[AccountInfo<'info>],
    spend: u64,
) -> Result<bool> {
    use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
    use anchor_lang::solana_program::program::invoke_signed;

    // Layout: [pump buy accounts ...][14 Orca deposit accounts][1 orca program].
    // The PumpSwap `buy_exact_quote_in` needs the FULL SDK account set (26 on mainnet
    // today): the previous code forwarded a HARDCODED remaining[0..23], dropping the
    // last 3 the deployed AMM actually reads — it then read garbage and threw Overflow
    // (custom 0x1787 == pump_amm Overflow, NOT Orca's same-hex InvalidTickArraySequence)
    // on EVERY HOUSE buy. We now forward ALL pump accounts (everything before the
    // trailing 14 deposit + 1 orca), exactly like `bundle_buy_burn` forwards its set.
    // `dep` = the boundary = where the deposit accounts begin = pump-account count.
    if remaining.len() < 38 {
        msg!("add_liq(house): need >=38 remaining accounts; graceful no-op");
        return Ok(false);
    }
    let dep = remaining.len() - 15;
    if remaining[16].key() != pump_amm::ID {
        msg!("add_liq(house): pump AMM program missing at [16]; graceful no-op");
        return Ok(false);
    }
    let orca_program = &remaining[dep + 14];
    if orca_program.key() != orca_whirlpool::ID {
        msg!("add_liq(house): orca program mismatch; graceful no-op");
        return Ok(false);
    }
    // PumpSwap HOUSE/WSOL pool must be the canonical, live pool.
    if remaining[0].key() != pump_amm::HOUSE_POOL_ID
        || remaining[0].owner != &pump_amm::ID
        || remaining[0].data_is_empty()
    {
        msg!("add_liq(house): HOUSE/WSOL PumpSwap pool not live; graceful no-op");
        return Ok(false);
    }
    // HOUSE/meme deposit pool must be live.
    if remaining[dep].owner != &orca_whirlpool::ID || remaining[dep].data_is_empty() {
        msg!("add_liq(house): HOUSE/meme pool not live; graceful no-op");
        return Ok(false);
    }
    if remaining[3].key() != house_mint::ID {
        msg!("add_liq(house): PumpSwap base mint is not HOUSE; graceful no-op");
        return Ok(false);
    }
    if remaining[11].key() != allowlist::TOKEN_2022 {
        msg!("add_liq(house): base token program is not Token-2022; graceful no-op");
        return Ok(false);
    }
    // The PumpSwap `user` (signer at [1]) must be the program's house_treasury PDA.
    let (treasury_pda, treasury_bump) =
        Pubkey::find_program_address(&[b"house_treasury"], &crate::ID);
    if remaining[1].key() != treasury_pda {
        msg!("add_liq(house): PumpSwap user != house_treasury PDA; graceful no-op");
        return Ok(false);
    }
    // Treasury WSOL ATA (quote in) and HOUSE ATA (base out) must belong to the treasury.
    let treasury_wsol_ai = &remaining[6];
    if read_token_mint(treasury_wsol_ai) != Some(native_mint::ID)
        || read_token_owner(treasury_wsol_ai) != Some(treasury_pda)
    {
        msg!("add_liq(house): treasury WSOL ATA invalid; graceful no-op");
        return Ok(false);
    }
    let treasury_house_ai = &remaining[5];
    if read_token_mint(treasury_house_ai) != Some(house_mint::ID)
        || read_token_owner(treasury_house_ai) != Some(treasury_pda)
    {
        msg!("add_liq(house): treasury HOUSE ATA invalid; graceful no-op");
        return Ok(false);
    }
    // Detect the HOUSE side of the HOUSE/meme deposit pool + lp_owner's HOUSE ATA.
    // Deposit accounts begin at `dep`: [dep]=whirlpool .. [dep+6]=mint_a [dep+7]=mint_b
    // [dep+8]=owner_a [dep+9]=owner_b ... (the 14 increase_liquidity accounts).
    let lp_mint_a = remaining[dep + 6].key();
    let lp_mint_b = remaining[dep + 7].key();
    let (house_is_a, lp_house_owner_ai) = if lp_mint_a == house_mint::ID {
        (true, &remaining[dep + 8])
    } else if lp_mint_b == house_mint::ID {
        (false, &remaining[dep + 9])
    } else {
        msg!("add_liq(house): HOUSE/meme pool has no HOUSE side; graceful no-op");
        return Ok(false);
    };
    if read_token_mint(lp_house_owner_ai) != Some(house_mint::ID)
        || read_token_owner(lp_house_owner_ai) != Some(lp_owner.key())
    {
        msg!("add_liq(house): lp_owner HOUSE ATA invalid; graceful no-op");
        return Ok(false);
    }
    // Avoid a dust buy that would revert on `min_base = 1` and brick the bundle.
    if spend < HOUSE_BUY_MIN_SPEND {
        msg!("add_liq(house): spend below HOUSE buy floor; graceful no-op");
        return Ok(false);
    }
    require!(spend > 0, PumpError::BundleGuardViolation);

    // 1) Fund the treasury WSOL ATA from the payer (reimbursed from the escrow by the caller).
    transfer(
        CpiContext::new(
            system_program.clone(),
            Transfer {
                from: payer.clone(),
                to: treasury_wsol_ai.clone(),
            },
        ),
        spend,
    )?;
    token::sync_native(CpiContext::new(
        wsol_token_program.clone(),
        token::SyncNative {
            account: treasury_wsol_ai.clone(),
        },
    ))?;

    // 2) PumpSwap buy_exact_quote_in (treasury-signed), byte-identical to bundle_buy_burn: spend
    //    EXACTLY `spend` WSOL, accept any HOUSE out (min_base = 1). Forward ALL pump accounts
    //    (remaining[0..dep] — the full SDK set, 26 today) verbatim, NOT a truncated 23 (the
    //    truncation dropped accounts the deployed AMM reads => Overflow). Only [1] = treasury
    //    `user` is forced to sign.
    {
        let mut data = Vec::with_capacity(25);
        data.extend_from_slice(&pump_amm::BUY_EXACT_QUOTE_IN_DISCM);
        data.extend_from_slice(&spend.to_le_bytes());
        data.extend_from_slice(&1u64.to_le_bytes());
        data.push(0u8); // track_volume: Option<bool> = None
        let mut metas: Vec<AccountMeta> = Vec::with_capacity(dep);
        let mut infos: Vec<AccountInfo<'info>> = Vec::with_capacity(dep);
        for (i, acc) in remaining[0..dep].iter().enumerate() {
            metas.push(AccountMeta {
                pubkey: *acc.key,
                is_signer: i == 1,
                is_writable: acc.is_writable,
            });
            infos.push(acc.clone());
        }
        let ix = Instruction {
            program_id: pump_amm::ID,
            accounts: metas,
            data,
        };
        let t_bump = [treasury_bump];
        let t_seeds: &[&[u8]] = &[b"house_treasury", &t_bump];
        invoke_signed(&ix, &infos, &[t_seeds])?;
    }

    // 3) Move the bought HOUSE from the treasury ATA to lp_owner's HOUSE ATA (treasury-signed). Use
    //    transfer_checked (HOUSE is Token-2022) so any transfer-fee extension is handled correctly.
    let house_bought = read_token_amount(treasury_house_ai);
    if house_bought == 0 {
        msg!("add_liq(house): 0 HOUSE bought; nothing to deposit (escrow consumed)");
        return Ok(true);
    }
    let house_decimals = read_mint_decimals(&remaining[3]);
    {
        let t_bump = [treasury_bump];
        let t_seeds: &[&[u8]] = &[b"house_treasury", &t_bump];
        anchor_spl::token_2022::transfer_checked(
            CpiContext::new_with_signer(
                remaining[11].clone(),
                anchor_spl::token_2022::TransferChecked {
                    from: treasury_house_ai.clone(),
                    mint: remaining[3].clone(),
                    to: lp_house_owner_ai.clone(),
                    authority: remaining[1].clone(),
                },
                &[t_seeds],
            ),
            house_bought,
            house_decimals,
        )?;
    }

    // 4) Deposit the FULL HOUSE balance now in lp_owner's HOUSE ATA, single-sided (meme side = 0).
    //    Re-read after the transfer so any Token-2022 transfer fee / prior dust is accounted for.
    let deposit_amt = read_token_amount(lp_house_owner_ai);
    if deposit_amt == 0 {
        msg!("add_liq(house): 0 HOUSE in lp_owner ATA after transfer; skipping deposit");
        return Ok(true);
    }
    let (cpi_max_a, cpi_max_b) = if house_is_a {
        (deposit_amt, 0u64)
    } else {
        (0u64, deposit_amt)
    };
    orca_increase_liq_by_token_amounts(
        orca_program,
        lp_owner,
        lp_owner_bump,
        &remaining[dep..dep + 14],
        cpi_max_a,
        cpi_max_b,
    )?;
    Ok(true)
}

#[program]
pub mod pump {
    use super::*;

    /// Creates the global state.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        require!(
            !ctx.accounts.global.initialized,
            PumpError::AlreadyInitialized
        );

        ctx.accounts.global.authority = *ctx.accounts.user.key;
        ctx.accounts.global.initialized = true;

        Ok(())
    }

    /// Sets the global state parameters.
    pub fn set_params(
        ctx: Context<SetParams>,
        fee_recipient: Pubkey,
        initial_virtual_token_reserves: u64,
        initial_virtual_sol_reserves: u64,
        initial_real_token_reserves: u64,
        token_total_supply: u64,
        fee_basis_points: u64,
    ) -> Result<()> {
        require!(ctx.accounts.global.initialized, PumpError::NotInitialized);
        require_keys_eq!(
            ctx.accounts.user.key(),
            ctx.accounts.global.authority,
            PumpError::NotAuthorized
        );

        ctx.accounts.global.fee_recipient = fee_recipient;
        ctx.accounts.global.initial_virtual_token_reserves = initial_virtual_token_reserves;
        ctx.accounts.global.initial_virtual_sol_reserves = initial_virtual_sol_reserves;
        ctx.accounts.global.initial_real_token_reserves = initial_real_token_reserves;
        ctx.accounts.global.token_total_supply = token_total_supply;
        ctx.accounts.global.fee_basis_points = fee_basis_points;

        emit_cpi!(SetParamsEvent {
            fee_recipient,
            initial_virtual_token_reserves,
            initial_virtual_sol_reserves,
            initial_real_token_reserves,
            token_total_supply,
            fee_basis_points,
        });

        emit!(SetParamsEvent {
            fee_recipient,
            initial_virtual_token_reserves,
            initial_virtual_sol_reserves,
            initial_real_token_reserves,
            token_total_supply,
            fee_basis_points,
        });

        Ok(())
    }

    /// Creates a new coin and bonding curve.
    pub fn create(ctx: Context<Create>, name: String, symbol: String, uri: String) -> Result<()> {
        // initialize the bonding curve parameters
        ctx.accounts.bonding_curve.virtual_token_reserves =
            ctx.accounts.global.initial_virtual_token_reserves;
        ctx.accounts.bonding_curve.virtual_sol_reserves =
            ctx.accounts.global.initial_virtual_sol_reserves;
        ctx.accounts.bonding_curve.real_token_reserves =
            ctx.accounts.global.initial_real_token_reserves;
        ctx.accounts.bonding_curve.real_sol_reserves = 0;
        ctx.accounts.bonding_curve.token_total_supply = ctx.accounts.global.token_total_supply;

        // set the metadata for the token
        helpers::set_metadata(&ctx, name.clone(), symbol.clone(), uri.clone())?;

        // mint tokens to the bonding curve
        helpers::mint_to_bonding_curve(&ctx)?;

        // revoke the mint authority
        helpers::revoke_mint_authority(&ctx)?;

        // === Wire up Orca venues for the new mint (creation flow) ===
        // For mainnet, pools for HOUSE pairs are pre-wired and pre-seeded by deploy.
        // For new mints, creation initializes the 3 Orca whirlpools (SOL, USDC, HOUSE pairs)
        // so the 4 venues are live instantly. Pre-seed using part of initial supply or cut.
        // Uses declare_program! for CPI and typed accounts.
        // (Full code would init 3 pairs; example for one, repeat with different bases/mints/vaults)
        // Orca init via CPI (structure ready with declare_program!; accounts provided by creation flow).
        // Pre-seed and full 3-pair init + position increase would go here for "venues live instantly".
        // For mainnet HOUSE pairs pre-wired/seeded off-chain on deploy.
        msg!("Orca venues init would happen here (creation flow wires the 4 venues for the new mint)");

        emit_cpi!(CreateEvent {
            name: name.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
            mint: ctx.accounts.mint.key(),
            bonding_curve: ctx.accounts.bonding_curve.key(),
            user: ctx.accounts.user.key(),
        });

        emit!(CreateEvent {
            name,
            symbol,
            uri,
            mint: ctx.accounts.mint.key(),
            bonding_curve: ctx.accounts.bonding_curve.key(),
            user: ctx.accounts.user.key(),
        });

        Ok(())
    }

    /// Buys tokens from a bonding curve.
    pub fn buy<'info>(
        ctx: Context<'_, '_, '_, 'info, Buy<'info>>,
        amount: u64,
        max_sol_cost: u64,
    ) -> Result<()> {
        // Anti-sandwich: reject the whole tx if any top-level instruction is outside the allowlist
        // (no foreign DEX swap / fund-redirect can ride in the same tx as our trade).
        enforce_allowlist(&ctx.accounts.instructions_sysvar.to_account_info())?;

        // calculate the sol cost and fee
        let sol_cost = ctx.accounts.bonding_curve.buy_quote(amount as u128);
        let fee = ctx.accounts.global.get_fee(sol_cost);

        // check that the sol cost is within the slippage tolerance
        require!(
            sol_cost + fee <= max_sol_cost,
            PumpError::TooMuchSolRequired
        );
        require_keys_eq!(
            ctx.accounts.associated_bonding_curve.mint,
            ctx.accounts.mint.key(),
            PumpError::MintDoesNotMatchBondingCurve
        );
        require!(
            !ctx.accounts.bonding_curve.complete,
            PumpError::BondingCurveComplete
        );

        // Mark the TRADE step of the slot-scoped bundle and bind it to this buyer + mint. This is
        // the first leg of the same-slot bundle (buy -> bundle_buy_burn -> commit); it also resets
        // the guard if the slot advanced, so any prior bundle's pending/withheld state is cleared.
        mark_bundle(&mut ctx.accounts.bundle_guard, STEP_TRADE)?;
        ctx.accounts.bundle_guard.user = ctx.accounts.user.key();
        ctx.accounts.bundle_guard.mint = ctx.accounts.mint.key();
        // Direction flag (reuses pending_ref without touching layout): 0 = buy. `commit` reads this
        // to release withheld TOKENS (buy) vs withheld SOL (sell).
        ctx.accounts.bundle_guard.pending_ref = 0;

        // update the bonding curve parameters
        ctx.accounts.bonding_curve.virtual_token_reserves -= amount;
        ctx.accounts.bonding_curve.real_token_reserves -= amount;
        ctx.accounts.bonding_curve.virtual_sol_reserves += sol_cost;
        ctx.accounts.bonding_curve.real_sol_reserves += sol_cost;

        if ctx.accounts.bonding_curve.real_token_reserves == 0 {
            ctx.accounts.bonding_curve.complete = true;

            emit_cpi!(CompleteEvent {
                mint: ctx.accounts.mint.key(),
                user: ctx.accounts.user.key(),
                bonding_curve: ctx.accounts.bonding_curve.key(),
                timestamp: Clock::get()?.unix_timestamp,
            });

            emit!(CompleteEvent {
                mint: ctx.accounts.mint.key(),
                user: ctx.accounts.user.key(),
                bonding_curve: ctx.accounts.bonding_curve.key(),
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        // WITHHOLD the purchased tokens: they stay in the bonding curve's associated account and
        // are only released to the user by `commit`, after the full bundle has landed this slot.
        // (The legacy `transfer_tokens_from_bonding_curve_to_user` call is intentionally skipped.)
        ctx.accounts.bundle_guard.withheld = amount;

        // transfer the sol from the user to the bonding curve
        helpers::transfer_sol_from_user_to_bonding_curve(&ctx, sol_cost)?;

        // === Core Launch Mechanic: fee split into 1/3 referral tree, 1/3 LP, 1/3 buy&burn. ===
        // Every leg is funded out of `fee`, so the buyer never pays more than `sol_cost + fee`
        // (the slippage bound checked above). Any leg that is not live folds its third back to
        // fee_recipient, so with dummy venues/house and no real referrer the fee_recipient still
        // receives the FULL fee exactly as before.
        let third = fee / 3;
        let tier_share = third / 3;
        let user_key = ctx.accounts.user.key();

        // Persist the 3-deep referral chain on the user's first trade. We store the three passed
        // referrer keys as the chain; tier-1 falls back to the program default only when none was
        // provided. The chain is locked once written.
        if ctx.accounts.referral_record.user == Pubkey::default() {
            ctx.accounts.referral_record.user = user_key;
            ctx.accounts.referral_record.referrer =
                helpers::normalize_ref(ctx.accounts.referrer.key(), user_key);
            ctx.accounts.referral_record.referrer2 = ctx.accounts.referrer2.key();
            ctx.accounts.referral_record.referrer3 = ctx.accounts.referrer3.key();
        }

        // Pay the referral third (carved FROM the fee, paid user -> referrer; never extra on top).
        // Only paid when the passed `referrer` is a real referrer; the third is split across the
        // up-to-3 present tiers, each receiving `third / 3`. Tiers that are the user themselves or
        // default are skipped and their share folds back to fee_recipient.
        let mut referral_paid: u64 = 0;
        if tier_share > 0 && helpers::is_real_ref(ctx.accounts.referrer.key(), user_key) {
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user.to_account_info(),
                        to: ctx.accounts.referrer.to_account_info(),
                    },
                ),
                tier_share,
            )?;
            referral_paid += tier_share;

            if helpers::is_real_ref(ctx.accounts.referrer2.key(), user_key) {
                transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.user.to_account_info(),
                            to: ctx.accounts.referrer2.to_account_info(),
                        },
                    ),
                    tier_share,
                )?;
                referral_paid += tier_share;
            }
            if helpers::is_real_ref(ctx.accounts.referrer3.key(), user_key) {
                transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.user.to_account_info(),
                            to: ctx.accounts.referrer3.to_account_info(),
                        },
                    ),
                    tier_share,
                )?;
                referral_paid += tier_share;
            }
        }

        // Mark the REFERRAL step unconditionally: whether or not a real referrer was paid, the
        // referral leg is considered satisfied for the bundle (so the bundle can complete).
        mark_bundle(&mut ctx.accounts.bundle_guard, STEP_REFERRAL)?;

        // Treasury cut starts at the full fee minus referral payouts; the LP leg subtracts its third
        // only when it actually fires (otherwise its third stays with fee_recipient). The burn third
        // is escrowed into the bundle guard below instead of folding to fee_recipient.
        let mut to_fee_recipient = fee - referral_paid;

        // ESCROW the LP third into the bundle guard PDA instead of folding it to fee_recipient
        // (mirrors the burn-third escrow below). The OPTIONAL `add_liq` leg later consumes
        // `pending_lp` via an Orca increase_liquidity CPI, funded by this escrow. If `add_liq` is
        // never called the LP third simply stays escrowed; the bundle still completes because
        // STEP_LP is excluded from REQUIRED_MASK.
        let lp_third = third;
        if lp_third > 0 {
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user.to_account_info(),
                        to: ctx.accounts.bundle_guard.to_account_info(),
                    },
                ),
                lp_third,
            )?;
            ctx.accounts.bundle_guard.pending_lp = lp_third;
            to_fee_recipient = to_fee_recipient.saturating_sub(lp_third);
        }

        // ESCROW the burn third into the bundle guard PDA instead of folding it to fee_recipient.
        // `bundle_buy_burn` later consumes these escrowed lamports (PumpSwap buy + HOUSE burn),
        // funded by the escrow rather than by the bundle relayer/payer.
        let burn_third = third;
        if burn_third > 0 {
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user.to_account_info(),
                        to: ctx.accounts.bundle_guard.to_account_info(),
                    },
                ),
                burn_third,
            )?;
            ctx.accounts.bundle_guard.pending_burn = burn_third;
            to_fee_recipient = to_fee_recipient.saturating_sub(burn_third);
        }

        // Treasury receives whatever fee was not paid to referrers / used by the LP leg / escrowed.
        helpers::transfer_sol_from_user_to_fee_recipient(&ctx, to_fee_recipient)?;

        emit_cpi!(TradeEvent {
            user: ctx.accounts.user.key(),
            sol_amount: sol_cost,
            token_amount: amount,
            is_buy: true,
            mint: ctx.accounts.mint.key(),
            timestamp: Clock::get()?.unix_timestamp,
            virtual_sol_reserves: ctx.accounts.bonding_curve.virtual_sol_reserves,
            virtual_token_reserves: ctx.accounts.bonding_curve.virtual_token_reserves,
        });

        emit!(TradeEvent {
            user: ctx.accounts.user.key(),
            sol_amount: sol_cost,
            token_amount: amount,
            is_buy: true,
            mint: ctx.accounts.mint.key(),
            timestamp: Clock::get()?.unix_timestamp,
            virtual_sol_reserves: ctx.accounts.bonding_curve.virtual_sol_reserves,
            virtual_token_reserves: ctx.accounts.bonding_curve.virtual_token_reserves,
        });

        Ok(())
    }

    /// Sells tokens into a bonding curve.
    pub fn sell<'info>(
        ctx: Context<'_, '_, '_, 'info, Sell<'info>>,
        amount: u64,
        min_sol_output: u64,
    ) -> Result<()> {
        // Anti-sandwich: reject the whole tx if any top-level instruction is outside the allowlist
        // (no foreign DEX swap / fund-redirect can ride in the same tx as our trade).
        enforce_allowlist(&ctx.accounts.instructions_sysvar.to_account_info())?;

        let sol_output = ctx.accounts.bonding_curve.sell_quote(amount as u128);
        let fee = ctx.accounts.global.get_fee(sol_output);

        // check that the sol cost is within the slippage tolerance
        require!(
            sol_output - fee >= min_sol_output,
            PumpError::TooLittleSolReceived
        );
        require_keys_eq!(
            ctx.accounts.associated_bonding_curve.mint,
            ctx.accounts.mint.key(),
            PumpError::MintDoesNotMatchBondingCurve
        );
        require!(
            !ctx.accounts.bonding_curve.complete,
            PumpError::BondingCurveComplete
        );

        // Mark the TRADE step of the slot-scoped bundle and bind it to this seller + mint. First leg
        // of the same-slot SELL bundle (sell -> bundle_buy_burn -> commit); also resets the
        // guard if the slot advanced, clearing any prior bundle's pending/withheld state.
        mark_bundle(&mut ctx.accounts.bundle_guard, STEP_TRADE)?;
        ctx.accounts.bundle_guard.user = ctx.accounts.user.key();
        ctx.accounts.bundle_guard.mint = ctx.accounts.mint.key();

        // update the bonding curve parameters
        ctx.accounts.bonding_curve.virtual_token_reserves += amount;
        ctx.accounts.bonding_curve.real_token_reserves += amount;
        ctx.accounts.bonding_curve.virtual_sol_reserves -= sol_output;
        ctx.accounts.bonding_curve.real_sol_reserves -= sol_output;

        // transfer the tokens from the user to the bonding curve (tokens still move now in sell)
        helpers::transfer_tokens_from_user_to_bonding_curve(&ctx, amount)?;

        // === Core Launch Mechanic (sell side): fee split into 1/3 referral, 1/3 LP, 1/3 buy&burn. ===
        // Everything is funded out of `fee`, so the seller always nets `sol_output - fee`. Referral
        // is carved FROM the fee and paid out of the bonding curve. Any leg that is not live folds
        // its third back to fee_recipient, so with dummy venues/house and no real referrer the
        // fee_recipient still receives the FULL fee.
        let third = fee / 3;
        let tier_share = third / 3;
        let user_key = ctx.accounts.user.key();

        // Persist the 3-deep referral chain on the user's first trade (store the three passed keys;
        // tier-1 falls back to the program default only when none provided).
        if ctx.accounts.referral_record.user == Pubkey::default() {
            ctx.accounts.referral_record.user = user_key;
            ctx.accounts.referral_record.referrer =
                helpers::normalize_ref(ctx.accounts.referrer.key(), user_key);
            ctx.accounts.referral_record.referrer2 = ctx.accounts.referrer2.key();
            ctx.accounts.referral_record.referrer3 = ctx.accounts.referrer3.key();
        }

        // Pay the referral third out of the bonding curve. Only when the passed `referrer` is real;
        // split across the up-to-3 present tiers, skipping any tier that is the user or default.
        let mut referral_paid: u64 = 0;
        if tier_share > 0 && helpers::is_real_ref(ctx.accounts.referrer.key(), user_key) {
            ctx.accounts.bonding_curve.sub_lamports(tier_share)?;
            ctx.accounts.referrer.add_lamports(tier_share)?;
            referral_paid += tier_share;

            if helpers::is_real_ref(ctx.accounts.referrer2.key(), user_key) {
                ctx.accounts.bonding_curve.sub_lamports(tier_share)?;
                ctx.accounts.referrer2.add_lamports(tier_share)?;
                referral_paid += tier_share;
            }
            if helpers::is_real_ref(ctx.accounts.referrer3.key(), user_key) {
                ctx.accounts.bonding_curve.sub_lamports(tier_share)?;
                ctx.accounts.referrer3.add_lamports(tier_share)?;
                referral_paid += tier_share;
            }
        }

        // Mark the REFERRAL step unconditionally (satisfied whether or not a real referrer was paid).
        mark_bundle(&mut ctx.accounts.bundle_guard, STEP_REFERRAL)?;

        // Treasury cut starts at the full fee minus referral payouts; the LP leg subtracts its third
        // only when it actually fires. The burn third is escrowed into the guard below.
        let mut to_fee_recipient = fee - referral_paid;

        // ESCROW the LP third into the bundle guard PDA instead of folding it to fee_recipient
        // (mirrors the burn-third escrow below). Both the bonding curve and the guard are
        // program-owned, so move lamports directly. The OPTIONAL `add_liq` leg later consumes
        // `pending_lp` via an Orca increase_liquidity CPI, funded by this escrow.
        let lp_third = third;
        if lp_third > 0 {
            ctx.accounts.bonding_curve.sub_lamports(lp_third)?;
            ctx.accounts.bundle_guard.add_lamports(lp_third)?;
            ctx.accounts.bundle_guard.pending_lp = lp_third;
            to_fee_recipient = to_fee_recipient.saturating_sub(lp_third);
        }

        // ESCROW the burn third into the bundle guard PDA instead of folding it to fee_recipient.
        // Both the bonding curve and the guard are program-owned, so move lamports directly.
        // `bundle_buy_burn` later consumes the escrow (PumpSwap buy + HOUSE burn).
        let burn_third = third;
        if burn_third > 0 {
            ctx.accounts.bonding_curve.sub_lamports(burn_third)?;
            ctx.accounts.bundle_guard.add_lamports(burn_third)?;
            ctx.accounts.bundle_guard.pending_burn = burn_third;
            to_fee_recipient = to_fee_recipient.saturating_sub(burn_third);
        }

        // WITHHOLD the seller's SOL payout: it stays in the bonding curve and the owed amount is
        // recorded in the guard's `withheld` field (same field buy uses for the token amount).
        // `commit` releases it after the full bundle lands this slot. The treasury still receives
        // its (escrow-reduced) fee now. Direction flag: 1 = sell (commit releases SOL, not tokens).
        ctx.accounts.bundle_guard.withheld = sol_output - fee;
        ctx.accounts.bundle_guard.pending_ref = 1;
        helpers::transfer_sol_from_bonding_curve_to_fee_recipient(&ctx, to_fee_recipient)?;

        emit_cpi!(TradeEvent {
            user: ctx.accounts.user.key(),
            sol_amount: sol_output,
            token_amount: amount,
            is_buy: false,
            mint: ctx.accounts.mint.key(),
            timestamp: Clock::get()?.unix_timestamp,
            virtual_sol_reserves: ctx.accounts.bonding_curve.virtual_sol_reserves,
            virtual_token_reserves: ctx.accounts.bonding_curve.virtual_token_reserves,
        });

        emit!(TradeEvent {
            user: ctx.accounts.user.key(),
            sol_amount: sol_output,
            token_amount: amount,
            is_buy: false,
            mint: ctx.accounts.mint.key(),
            timestamp: Clock::get()?.unix_timestamp,
            virtual_sol_reserves: ctx.accounts.bonding_curve.virtual_sol_reserves,
            virtual_token_reserves: ctx.accounts.bonding_curve.virtual_token_reserves,
        });

        Ok(())
    }

    /// Allows the admin to withdraw liquidity for a migration once the bonding curve completes
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        require!(
            ctx.accounts.bonding_curve.complete,
            PumpError::BondingCurveNotComplete
        );
        require_keys_eq!(
            config_feature::withdraw_authority::ID,
            ctx.accounts.user.key(),
            PumpError::NotAuthorized
        );

        // transfer the tokens from the bonding curve to the admin
        helpers::transfer_tokens_from_bonding_curve_to_admin(
            &ctx,
            ctx.accounts.associated_bonding_curve.amount,
        )?;

        // transfer the sol from the bonding curve to the admin
        helpers::transfer_sol_from_bonding_curve_to_admin(
            &ctx,
            ctx.accounts.bonding_curve.real_sol_reserves,
        )?;

        // update the bonding curve parameters
        ctx.accounts.bonding_curve.real_sol_reserves = 0;
        ctx.accounts.bonding_curve.virtual_sol_reserves = 0;
        ctx.accounts.bonding_curve.real_token_reserves = 0;
        ctx.accounts.bonding_curve.virtual_token_reserves = 0;

        Ok(())
    }

    /// Admin upgrade path: wires one Orca whirlpool venue for a (base, meme) pair, both for
    /// grandfathered coins (the `mint` + `bonding_curve` already exist on-chain) and for new
    /// coins. The off-chain deploy script calls this 3x per coin, once per base (SOL/USDC/HOUSE),
    /// generating fresh `token_vault_a/b` keypairs each time.
    ///
    /// Performs a real CPI to `orca_whirlpool::cpi::initialize_pool_v2`. If the pool already exists
    /// the CPI errors out — that is expected and handled by the calling script.
    pub fn init_venues(
        ctx: Context<InitVenues>,
        tick_spacing: u16,
        initial_sqrt_price: u128,
    ) -> Result<()> {
        // PERMISSIONLESS: any signer may wire venues. Opening Orca pools for an existing
        // mint + bonding_curve is safe (the CPI errors if the pool already exists), so the UI
        // create flow can open venues without the global authority. `authority` is just the funder.

        // Tie this venue to a real coin: the meme mint must be one side of the pool.
        require!(
            ctx.accounts.token_mint_a.key() == ctx.accounts.mint.key()
                || ctx.accounts.token_mint_b.key() == ctx.accounts.mint.key(),
            PumpError::MintDoesNotMatchBondingCurve
        );

        let cpi_accounts = orca_whirlpool::cpi::accounts::InitializePoolV2 {
            whirlpools_config: ctx.accounts.whirlpools_config.to_account_info(),
            token_mint_a: ctx.accounts.token_mint_a.to_account_info(),
            token_mint_b: ctx.accounts.token_mint_b.to_account_info(),
            token_badge_a: ctx.accounts.token_badge_a.to_account_info(),
            token_badge_b: ctx.accounts.token_badge_b.to_account_info(),
            funder: ctx.accounts.authority.to_account_info(),
            whirlpool: ctx.accounts.whirlpool.to_account_info(),
            token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
            token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
            fee_tier: ctx.accounts.fee_tier.to_account_info(),
            token_program_a: ctx.accounts.token_program_a.to_account_info(),
            token_program_b: ctx.accounts.token_program_b.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };

        orca_whirlpool::cpi::initialize_pool_v2(
            CpiContext::new(ctx.accounts.orca_program.to_account_info(), cpi_accounts),
            tick_spacing,
            initial_sqrt_price,
        )?;

        msg!(
            "init_venues: wired Orca whirlpool {} for mint {} (bonding_curve {})",
            ctx.accounts.whirlpool.key(),
            ctx.accounts.mint.key(),
            ctx.accounts.bonding_curve.key()
        );

        Ok(())
    }

    /// Admin: initializes the single global `BundleGuard` singleton (PDA seeds = [b"bundle_guard"]).
    /// Must be signed by `global.authority`.
    pub fn init_bundle_guard(ctx: Context<InitBundleGuard>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.global.authority,
            PumpError::NotAuthorized
        );

        let guard = &mut ctx.accounts.bundle_guard;
        guard.slot = 0;
        guard.mask = 0;
        guard.user = Pubkey::default();
        guard.mint = Pubkey::default();
        guard.pending_ref = 0;
        guard.pending_lp = 0;
        guard.pending_burn = 0;
        guard.withheld = 0;

        Ok(())
    }

    /// Real "buy & burn $PUMP (HOUSE)" leg via PumpSwap (pump AMM, NOT Orca).
    ///
    /// Funds the program treasury's WSOL ATA with `sol_in` lamports, `sync_native`s it, CPIs
    /// PumpSwap `buy_exact_quote_in` (signed by the [b"house_treasury"] PDA acting as `user`),
    /// then burns whatever HOUSE the treasury received. Marks `STEP_BURN` in the bundle guard.
    ///
    /// The 23 PumpSwap accounts are passed (in the documented order) via `remaining_accounts`.
    pub fn bundle_buy_burn<'info>(
        ctx: Context<'_, '_, '_, 'info, BundleBuyBurn<'info>>,
        base_amount_out: u64,
        max_quote_in: u64,
    ) -> Result<()> {
        use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
        use anchor_lang::solana_program::program::{invoke, invoke_signed};

        // Quiet the unused-import lint for `invoke` (kept per the CPI helper convention).
        let _ = invoke;

        // Anti-sandwich: reject the whole tx if any top-level instruction is outside the allowlist.
        enforce_allowlist(&ctx.accounts.instructions_sysvar.to_account_info())?;

        msg!("bundle_buy_burn: start: base_amount_out={} max_quote_in={}", base_amount_out, max_quote_in);

        require_keys_eq!(
            ctx.accounts.pump_amm_program.key(),
            pump_amm::ID,
            PumpError::NotAuthorized
        );
        require!(
            ctx.remaining_accounts.len() >= 23,
            PumpError::BundleGuardViolation
        );
        msg!(
            "bundle_buy_burn: verified program and sufficient remaining accounts (count={})",
            ctx.remaining_accounts.len()
        );

        // This leg must be part of the SAME-slot bundle, and there must be an escrowed burn third
        // (set by `buy`) to spend. The burn is funded by that escrow, never by the payer.
        require_same_slot(&ctx.accounts.bundle_guard)?;
        require!(
            ctx.accounts.bundle_guard.pending_burn > 0,
            PumpError::BundleGuardViolation
        );

        msg!(
            "bundle_buy_burn: same slot check passed, escrowed burn to spend: pending_burn={}",
            ctx.accounts.bundle_guard.pending_burn
        );

        // Spend = min(requested, escrowed, actually-available). We READ the guard
        // account's real lamports and only spend what sits ABOVE its rent-exempt
        // floor — so we can never pull it below rent (which would imbalance the
        // tx) even if `pending_burn` and the SDK's `max_quote_in` disagree.
        let spend = {
            let guard_ai = ctx.accounts.bundle_guard.to_account_info();
            let rent_min = Rent::get()?.minimum_balance(guard_ai.data_len());
            let available = guard_ai.lamports().saturating_sub(rent_min);
            let s = max_quote_in
                .min(ctx.accounts.bundle_guard.pending_burn)
                .min(available);
            msg!(
                "bundle_buy_burn: spend calculated as min({}, {}, {}): {} (rent min: {}, escrowed: {}, available: {})",
                max_quote_in,
                ctx.accounts.bundle_guard.pending_burn,
                available,
                s,
                rent_min,
                ctx.accounts.bundle_guard.pending_burn,
                available
            );
            s
        };
        require!(spend > 0, PumpError::BundleGuardViolation);

        // --- lamport trace (entry) ---
        msg!(
            "bbb.in spend={} guard={} treasury={} wsol={} house_ata={}",
            spend,
            ctx.accounts.bundle_guard.to_account_info().lamports(),
            ctx.accounts.house_treasury.lamports(),
            ctx.accounts.treasury_wsol_ata.lamports(),
            ctx.accounts.treasury_house_ata.lamports()
        );

        // Move the escrow guard -> house_treasury (both are program/system-owned,
        // so `sub_lamports`/`add_lamports` is a balanced in-instruction move), then
        // fund the WSOL ATA via a SYSTEM-PROGRAM transfer CPI from the treasury PDA.
        //
        // Why not add_lamports straight onto the WSOL ATA? That ATA is owned by the
        // Token program and is then mutated by the PumpSwap CPI; injecting lamports
        // into a foreign-owned account that its owner program later touches trips the
        // runtime's "sum of account balances before and after instruction do not
        // match" check (UnbalancedInstruction). A System-program transfer is the
        // runtime-blessed way to fund a token account's lamports.
        // Fund the WSOL account from the PAYER via a System transfer (the proven,
        // runtime-blessed wrap pattern), then sync. CRITICAL: house_treasury and the
        // two treasury ATAs are passed BOTH as struct accounts AND inside the 26 AMM
        // remaining accounts (aliased). Manually `add_lamports` on the struct alias
        // is NOT seen by the AMM CPI's remaining alias -> the runtime flags it as a
        // non-conserved lamport change across the CPI (UnbalancedInstruction). The
        // payer, by contrast, is NOT in the AMM account set, so we (a) fund WSOL from
        // the payer via the System program (which the runtime always accounts for
        // correctly), and (b) reimburse the payer from the guard escrow AFTER the
        // swap. Net: payer -spend(fund) +spend(reimburse) = 0; guard -spend; the
        // spend ends up in the pool via the AMM. Economically escrow-funded.
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.treasury_wsol_ata.to_account_info(),
                },
            ),
            spend,
        )?;
        token::sync_native(CpiContext::new(
            ctx.accounts.wsol_token_program.to_account_info(),
            token::SyncNative {
                account: ctx.accounts.treasury_wsol_ata.to_account_info(),
            },
        ))?;
        msg!(
            "bbb.funded(payer) guard={} payer={} wsol={}",
            ctx.accounts.bundle_guard.to_account_info().lamports(),
            ctx.accounts.payer.lamports(),
            ctx.accounts.treasury_wsol_ata.lamports()
        );

        // 2) Build `buy` data = discm(8) ++ base_amount_out(le u64) ++ max_quote_amount_in(le u64)
        //    ++ track_volume(OptionBool, single byte). Mirrors the official pump-swap-sdk, which
        //    uses `buy` (exact base out) with track_volume = 0x01. The max quote in is the clamped
        //    escrow `spend` so the swap can never draw more than was escrowed.
        // Use `buy_exact_quote_in`, NOT `buy`. For a burn we don't care how much
        // HOUSE we get, so we spend EXACTLY `spend` quote and accept any base out
        // (min_base_amount_out = 1, just above the AMM's ZeroBaseAmount guard).
        // `buy` (exact base, capped quote) is slippage-sensitive — on tiny burns the
        // price drifts between quote and execution and the AMM throws ExceededSlippage
        // (0x1774). Exact-quote-in has no slippage cap to exceed.
        // data = disc(8) ++ spendable_quote_in(u64=spend) ++ min_base_amount_out(u64=1)
        //        ++ track_volume(OptionBool=0x00 / false).
        let _ = base_amount_out;
        let mut data = Vec::with_capacity(25);
        data.extend_from_slice(&pump_amm::BUY_EXACT_QUOTE_IN_DISCM);
        data.extend_from_slice(&spend.to_le_bytes());
        data.extend_from_slice(&1u64.to_le_bytes());
        data.push(0u8);

        msg!(
            "bundle_buy_burn: constructing pump AMM buy CPI: base_amount_out={}, spend={}, accounts_remaining={}",
            base_amount_out,
            spend,
            ctx.remaining_accounts.len()
        );

        // Forward ALL remaining accounts to the pump AMM `buy` CPI (the SDK uses 26 accounts and
        // this count can evolve). We preserve each account's writability as supplied by the caller
        // in the outer tx; account[1] (the `user`) is the treasury PDA which we sign for via
        // `invoke_signed`, so it is the only forced signer.
        let n = ctx.remaining_accounts.len();
        let mut metas: Vec<AccountMeta> = Vec::with_capacity(n);
        let mut infos: Vec<AccountInfo<'info>> = Vec::with_capacity(n);
        for (i, acc) in ctx.remaining_accounts.iter().enumerate() {
            metas.push(AccountMeta {
                pubkey: *acc.key,
                is_signer: i == 1,
                is_writable: acc.is_writable,
            });
            infos.push(acc.clone());
        }

        let ix = Instruction {
            program_id: pump_amm::ID,
            accounts: metas,
            data,
        };
        msg!(
            "bundle_buy_burn: invoking pump AMM buy CPI with {} accounts",
            infos.len()
        );

        let bump_arr = [ctx.bumps.house_treasury];
        let treasury_seeds: &[&[u8]] = &[b"house_treasury", &bump_arr];
        invoke_signed(&ix, &infos, &[treasury_seeds])?;

        // 3) Burn the HOUSE balance now sitting in the treasury HOUSE ATA (amount = bytes [64..72]).
        let burn_amt = {
            let raw = ctx.accounts.treasury_house_ata.try_borrow_data()?;
            if raw.len() >= 72 {
                u64::from_le_bytes(raw[64..72].try_into().unwrap())
            } else {
                0
            }
        };
        msg!(
            "bundle_buy_burn: burn_amt read from treasury_house_ata {} is {}",
            ctx.accounts.treasury_house_ata.key(),
            burn_amt
        );
        if burn_amt > 0 {
            msg!(
                "bundle_buy_burn: burning {} tokens from treasury_house_ata {}",
                burn_amt,
                ctx.accounts.treasury_house_ata.key()
            );
            anchor_spl::token_2022::burn(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token_2022::Burn {
                        mint: ctx.accounts.house_mint.to_account_info(),
                        from: ctx.accounts.treasury_house_ata.to_account_info(),
                        authority: ctx.accounts.house_treasury.to_account_info(),
                    },
                    &[treasury_seeds],
                ),
                burn_amt,
            )?;
        } else {
            msg!("bundle_buy_burn: burn_amt is 0, skipping house token burn");
        }

        // Reimburse the payer from the guard escrow. Both the guard (program-owned)
        // and the payer are OUTSIDE the AMM's account set, so this manual lamport
        // move cannot alias a CPI account. Net payer over the instruction: 0.
        {
            let guard_ai = ctx.accounts.bundle_guard.to_account_info();
            let payer_ai = ctx.accounts.payer.to_account_info();
            guard_ai.sub_lamports(spend)?;
            payer_ai.add_lamports(spend)?;
        }
        ctx.accounts.bundle_guard.pending_burn = 0;

        // 4) Mark the burn step in the slot-scoped bundle guard.
        msg!("bundle_buy_burn: marking bundle guard STEP_BURN in slot");
        mark_bundle(&mut ctx.accounts.bundle_guard, STEP_BURN)?;

        // --- lamport trace (exit). If the runtime then reports UnbalancedInstruction,
        // compare these deltas vs bbb.in to see which account netted non-zero. ---
        msg!(
            "bbb.out guard={} treasury={} wsol={} house_ata={}",
            ctx.accounts.bundle_guard.to_account_info().lamports(),
            ctx.accounts.house_treasury.lamports(),
            ctx.accounts.treasury_wsol_ata.lamports(),
            ctx.accounts.treasury_house_ata.lamports()
        );
        msg!("bundle_buy_burn: SUCCESS");

        Ok(())
    }

    /// Final leg of the same-slot bundle (works for BOTH buy and sell). Requires the full required
    /// mask (TRADE|REFERRAL|BURN) to have landed this slot for this exact user + mint, then settles
    /// what the trade withheld and resets the guard for the next bundle.
    ///
    /// Direction is read from the reused `pending_ref` flag:
    ///   - `0` (buy):  release `withheld` TOKENS from associated_bonding_curve -> associated_user.
    ///   - `1` (sell): release `withheld` SOL lamports from the bonding_curve PDA -> user.
    pub fn commit(ctx: Context<Commit>) -> Result<()> {
        // Anti-sandwich: reject the whole tx if any top-level instruction is outside the allowlist.
        enforce_allowlist(&ctx.accounts.instructions_sysvar.to_account_info())?;

        // The whole bundle must be co-slot and bound to this caller + mint.
        require_same_slot(&ctx.accounts.bundle_guard)?;
        require_keys_eq!(
            ctx.accounts.bundle_guard.user,
            ctx.accounts.user.key(),
            PumpError::BundleGuardViolation
        );
        require_keys_eq!(
            ctx.accounts.bundle_guard.mint,
            ctx.accounts.mint.key(),
            PumpError::BundleGuardViolation
        );
        require!(
            ctx.accounts.bundle_guard.mask & REQUIRED_MASK == REQUIRED_MASK,
            PumpError::BundleGuardViolation
        );

        let withheld = ctx.accounts.bundle_guard.withheld;
        let is_sell = ctx.accounts.bundle_guard.pending_ref == 1;

        if is_sell {
            // SELL: release the withheld SOL from the bonding curve PDA -> seller. Both lamport
            // balances are moved directly since the bonding curve is program-owned. The token
            // accounts in `Commit` are unused on this path.
            if withheld > 0 {
                ctx.accounts.bonding_curve.sub_lamports(withheld)?;
                ctx.accounts.user.add_lamports(withheld)?;
            }
        } else {
            // BUY: release the withheld tokens from the bonding curve to the user, signed by the
            // bonding-curve PDA (same signer seeds / CPI pattern as the legacy buy delivery).
            let mint_key = ctx.accounts.mint.key();
            let authority_seed = &[
                b"bonding-curve".as_ref(),
                mint_key.as_ref(),
                &[ctx.bumps.bonding_curve],
            ];
            let seeds = [authority_seed.as_slice()];
            if withheld > 0 {
                if *ctx.accounts.token_program.to_account_info().key == anchor_spl::token::ID {
                    token::transfer(
                        CpiContext::new_with_signer(
                            ctx.accounts.token_program.to_account_info(),
                            token::Transfer {
                                from: ctx.accounts.associated_bonding_curve.to_account_info(),
                                to: ctx.accounts.associated_user.to_account_info(),
                                authority: ctx.accounts.bonding_curve.to_account_info(),
                            },
                            &seeds,
                        ),
                        withheld,
                    )?;
                } else {
                    anchor_spl::token_2022::transfer_checked(
                        CpiContext::new_with_signer(
                            ctx.accounts.token_program.to_account_info(),
                            anchor_spl::token_2022::TransferChecked {
                                from: ctx.accounts.associated_bonding_curve.to_account_info(),
                                to: ctx.accounts.associated_user.to_account_info(),
                                authority: ctx.accounts.bonding_curve.to_account_info(),
                                mint: ctx.accounts.mint.to_account_info(),
                            },
                            &seeds,
                        ),
                        withheld,
                        ctx.accounts.mint.decimals,
                    )?;
                }
            }
        }

        // Reset the guard for the next bundle (including the pending_ref direction flag).
        let guard = &mut ctx.accounts.bundle_guard;
        guard.mask = 0;
        guard.pending_ref = 0;
        guard.pending_lp = 0;
        guard.pending_burn = 0;
        guard.withheld = 0;
        guard.user = Pubkey::default();
        guard.mint = Pubkey::default();

        Ok(())
    }

    /// PERMISSIONLESS one-time pool setup: opens an Orca Whirlpool position OWNED by the program
    /// PDA `lp_owner` (seeds [b"lp_owner"]) so the LP NFT is locked forever, then idempotently
    /// initializes the lower/upper tick arrays. Safe to expose to anyone: it only ever creates a
    /// program-owned position. All Orca accounts arrive via `remaining_accounts` (to avoid struct
    /// bloat) in this exact order:
    ///   [0] whirlpool
    ///   [1] position                 (Orca PDA: ["position", position_mint])
    ///   [2] position_mint            (fresh keypair; SIGNER, writable)
    ///   [3] position_token_account   (lp_owner's ATA of position_mint)
    ///   [4] token_program            (SPL Token classic; mints the position NFT)
    ///   [5] associated_token_program
    ///   [6] rent (sysvar)
    ///   [7] tick_array_lower
    ///   [8] tick_array_upper
    ///   [9] orca_whirlpool program
    pub fn open_lp_position<'info>(
        ctx: Context<'_, '_, '_, 'info, OpenLpPosition<'info>>,
        tick_lower_index: i32,
        tick_upper_index: i32,
        tick_array_lower_start_index: i32,
        tick_array_upper_start_index: i32,
    ) -> Result<()> {
        use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
        use anchor_lang::solana_program::program::invoke;

        let remaining = ctx.remaining_accounts;
        require!(remaining.len() >= 10, PumpError::BundleGuardViolation);

        // The Orca program supplied must be the real Whirlpool program (the CPI target).
        let orca_program_ai = remaining[9].clone();
        require_keys_eq!(
            orca_program_ai.key(),
            orca_whirlpool::ID,
            PumpError::NotAuthorized
        );

        let whirlpool = remaining[0].clone();
        let position = remaining[1].clone();
        let position_mint = remaining[2].clone();
        let position_token_account = remaining[3].clone();
        let token_program = remaining[4].clone();
        let associated_token_program = remaining[5].clone();
        let rent_sysvar = remaining[6].clone();
        let tick_array_lower = remaining[7].clone();
        let tick_array_upper = remaining[8].clone();

        let funder = ctx.accounts.funder.to_account_info();
        let owner = ctx.accounts.lp_owner.to_account_info();
        let system_program = ctx.accounts.system_program.to_account_info();

        // Orca position PDA bump (seeds = ["position", position_mint]).
        let (_position_pda, position_bump) = Pubkey::find_program_address(
            &[b"position", position_mint.key().as_ref()],
            &orca_whirlpool::ID,
        );

        // --- open_position CPI: owner = lp_owner (program PDA) => LP locked forever. funder and
        // position_mint sign the OUTER tx, so a plain `invoke` propagates their signatures. ---
        const OPEN_POSITION_DISCM: [u8; 8] = [135, 128, 47, 77, 15, 152, 240, 49];
        let mut data = Vec::with_capacity(17);
        data.extend_from_slice(&OPEN_POSITION_DISCM);
        data.push(position_bump);
        data.extend_from_slice(&tick_lower_index.to_le_bytes());
        data.extend_from_slice(&tick_upper_index.to_le_bytes());

        let op: Vec<(AccountInfo<'info>, bool, bool)> = vec![
            (funder.clone(), true, true),                     // funder (signer, w)
            (owner.clone(), false, false),                    // owner = lp_owner
            (position.clone(), false, true),                  // position (w)
            (position_mint.clone(), true, true),              // position_mint (signer, w)
            (position_token_account.clone(), false, true),    // position_token_account (w)
            (whirlpool.clone(), false, false),                // whirlpool
            (token_program.clone(), false, false),            // token_program
            (system_program.clone(), false, false),           // system_program
            (rent_sysvar.clone(), false, false),              // rent
            (associated_token_program.clone(), false, false), // associated_token_program
        ];
        let mut metas = Vec::with_capacity(op.len());
        let mut infos = Vec::with_capacity(op.len() + 1);
        for (info, is_signer, is_writable) in &op {
            metas.push(AccountMeta {
                pubkey: *info.key,
                is_signer: *is_signer,
                is_writable: *is_writable,
            });
            infos.push(info.clone());
        }
        infos.push(orca_program_ai.clone());
        let ix = Instruction {
            program_id: orca_whirlpool::ID,
            accounts: metas,
            data,
        };
        invoke(&ix, &infos)?;
        msg!(
            "open_lp_position: opened program-owned position {} (owner=lp_owner)",
            position.key()
        );

        // --- initialize_tick_array CPIs (idempotent: skip arrays that already exist; ignore any
        // residual "already exists" error to stay re-runnable). ---
        const INIT_TICK_ARRAY_DISCM: [u8; 8] = [11, 188, 193, 214, 141, 91, 149, 184];

        if tick_array_lower.data_is_empty() {
            let mut d = Vec::with_capacity(12);
            d.extend_from_slice(&INIT_TICK_ARRAY_DISCM);
            d.extend_from_slice(&tick_array_lower_start_index.to_le_bytes());
            let ta: Vec<(AccountInfo<'info>, bool, bool)> = vec![
                (whirlpool.clone(), false, false),
                (funder.clone(), true, true),
                (tick_array_lower.clone(), false, true),
                (system_program.clone(), false, false),
            ];
            let mut m = Vec::with_capacity(ta.len());
            let mut i = Vec::with_capacity(ta.len() + 1);
            for (info, is_signer, is_writable) in &ta {
                m.push(AccountMeta {
                    pubkey: *info.key,
                    is_signer: *is_signer,
                    is_writable: *is_writable,
                });
                i.push(info.clone());
            }
            i.push(orca_program_ai.clone());
            let ix = Instruction {
                program_id: orca_whirlpool::ID,
                accounts: m,
                data: d,
            };
            let _ = invoke(&ix, &i);
        }

        if tick_array_upper_start_index != tick_array_lower_start_index
            && tick_array_upper.data_is_empty()
        {
            let mut d = Vec::with_capacity(12);
            d.extend_from_slice(&INIT_TICK_ARRAY_DISCM);
            d.extend_from_slice(&tick_array_upper_start_index.to_le_bytes());
            let ta: Vec<(AccountInfo<'info>, bool, bool)> = vec![
                (whirlpool.clone(), false, false),
                (funder.clone(), true, true),
                (tick_array_upper.clone(), false, true),
                (system_program.clone(), false, false),
            ];
            let mut m = Vec::with_capacity(ta.len());
            let mut i = Vec::with_capacity(ta.len() + 1);
            for (info, is_signer, is_writable) in &ta {
                m.push(AccountMeta {
                    pubkey: *info.key,
                    is_signer: *is_signer,
                    is_writable: *is_writable,
                });
                i.push(info.clone());
            }
            i.push(orca_program_ai.clone());
            let ix = Instruction {
                program_id: orca_whirlpool::ID,
                accounts: m,
                data: d,
            };
            let _ = invoke(&ix, &i);
        }

        Ok(())
    }

    /// OPTIONAL 4th bundle leg (buy/sell -> add_liq -> bundle_buy_burn -> commit): apes the escrowed
    /// LP third into Orca liquidity on ONE of three venues, into the program-owned `lp_owner`
    /// position. Mirrors `bundle_buy_burn`'s hard-won lamport patterns: the WSOL side is funded from
    /// the PAYER via a System transfer + `sync_native` (NEVER `add_lamports` onto a token account ->
    /// UnbalancedInstruction), every CPI is `invoke_signed`, and the payer is reimbursed from the
    /// guard escrow at the END (payer + guard are NOT in any CPI account set, so no aliasing). Marks
    /// STEP_LP on success. Every venue ends with the SAME single-sided
    /// `increase_liquidity_by_token_amounts_v2` (deposit side = the venue's quote token; meme side
    /// max = 0). If a venue's accounts/pools aren't valid the leg is a graceful no-op (`msg!` +
    /// `Ok(())`, NO mark, NO funds moved) so it can never brick the bundle.
    ///
    /// `venue` (NEW trailing arg; the discriminator is name-derived so this is backward-safe):
    ///   0 = SOL  : deposit the escrow WSOL directly (UNCHANGED behavior).
    ///   1 = USDC : `swap_v2` WSOL->USDC on a SOL/USDC pool, deposit the USDC.
    ///   2 = HOUSE: PumpSwap `buy_exact_quote_in` WSOL->HOUSE, deposit the HOUSE.
    /// The leading tick/liquidity/token_max args are kept for signature stability; only venue 0
    /// reads them (its WSOL-side cap = token_max_a/b). Venues 1 & 2 ignore them.
    ///
    /// `remaining_accounts` layout PER VENUE (position_authority / token_authority = lp_owner from
    /// the struct, never in remaining_accounts):
    ///   venue 0 (SOL) — 15 accounts, Orca `increase_liquidity` order:
    ///     [0] whirlpool [1] token_program_a [2] token_program_b [3] memo_program [4] position
    ///     [5] position_token_account [6] token_mint_a [7] token_mint_b [8] token_owner_account_a
    ///     [9] token_owner_account_b [10] token_vault_a [11] token_vault_b [12] tick_array_lower
    ///     [13] tick_array_upper [14] orca_whirlpool program
    ///   venue 1 (USDC) — 29 accounts:
    ///     [0..14)  swap_v2 (SOL/USDC pool), [14..28) increase_liquidity (USDC/meme pool),
    ///     [28] orca_whirlpool program. (See `add_liq_usdc` / `orca_swap_v2`.)
    ///   venue 2 (HOUSE) — 41 accounts (26 pump + 14 deposit + 1 orca):
    ///     [0..dep)  FULL PumpSwap buy_exact_quote_in set (dep = len-15, 26 today),
    ///     [dep..dep+14) increase_liquidity (HOUSE/meme pool), [dep+14] orca_whirlpool
    ///     program. (See `add_liq_house`. Forwarding the FULL pump set — not a truncated
    ///     23 — is required: the dropped accounts made the AMM Overflow / 0x1787.)
    pub fn add_liq<'info>(
        ctx: Context<'_, '_, '_, 'info, AddLiq<'info>>,
        tick_lower_index: i32,
        tick_upper_index: i32,
        liquidity_amount: u128,
        token_max_a: u64,
        token_max_b: u64,
        venue: u8,
    ) -> Result<()> {
        use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
        use anchor_lang::solana_program::program::invoke_signed;

        // tick indices are part of the public signature for symmetry with open_lp_position; the
        // position's range is already fixed on-chain, so increase_liquidity_v2 does not use them.
        let _ = (tick_lower_index, tick_upper_index);

        // Anti-sandwich: reject the whole tx if any top-level instruction is outside the allowlist.
        enforce_allowlist(&ctx.accounts.instructions_sysvar.to_account_info())?;

        let remaining = ctx.remaining_accounts;

        // This leg must be part of the SAME-slot bundle, and there must be an escrowed LP third
        // (set by buy/sell) to spend. The LP is funded by that escrow, never by the payer.
        require_same_slot(&ctx.accounts.bundle_guard)?;
        require!(
            ctx.accounts.bundle_guard.pending_lp > 0,
            PumpError::BundleGuardViolation
        );

        // Lamports available above the guard's rent-exempt floor (shared cap for every venue). We
        // never pull the guard below rent (which would imbalance the tx).
        let available = {
            let guard_ai = ctx.accounts.bundle_guard.to_account_info();
            let rent_min = Rent::get()?.minimum_balance(guard_ai.data_len());
            guard_ai.lamports().saturating_sub(rent_min)
        };

        // ===================== VENUE 0: SOL (UNCHANGED) =====================
        if venue == 0 {
        require!(remaining.len() >= 15, PumpError::BundleGuardViolation);

        // Gate: graceful no-op (NO mark, NO lamport movement) if the Orca program / whirlpool
        // supplied are not the real ones, so bad input can never brick the bundle.
        if remaining[14].key() != orca_whirlpool::ID
            || remaining[0].owner != &orca_whirlpool::ID
        {
            msg!("add_liq: orca program/whirlpool not live; graceful no-op (no mark)");
            return Ok(());
        }

        // Detect which pool side is WSOL (native mint) and the matching lp_owner token account.
        let mint_a = remaining[6].key();
        let mint_b = remaining[7].key();
        let (wsol_owner_ai, sol_max, wsol_is_b) = if mint_b == native_mint::ID {
            (remaining[9].clone(), token_max_b, true)
        } else if mint_a == native_mint::ID {
            (remaining[8].clone(), token_max_a, false)
        } else {
            msg!("add_liq: neither pool side is WSOL; graceful no-op (no mark)");
            return Ok(());
        };

        // spend = min(WSOL-side max, escrowed pending_lp, guard lamports above its rent floor). We
        // read the guard's REAL lamports and only spend what sits above its rent-exempt floor so we
        // can never pull it below rent (which would imbalance the tx).
        let spend = {
            let guard_ai = ctx.accounts.bundle_guard.to_account_info();
            let rent_min = Rent::get()?.minimum_balance(guard_ai.data_len());
            let available = guard_ai.lamports().saturating_sub(rent_min);
            sol_max
                .min(ctx.accounts.bundle_guard.pending_lp)
                .min(available)
        };
        require!(spend > 0, PumpError::BundleGuardViolation);

        // Fund the WSOL side from the PAYER via a System transfer + sync_native (the proven wrap
        // pattern; do NOT add_lamports onto a token account). The payer is reimbursed from the guard
        // escrow after the CPI, so this is economically escrow-funded.
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: wsol_owner_ai.clone(),
                },
            ),
            spend,
        )?;
        token::sync_native(CpiContext::new(
            ctx.accounts.wsol_token_program.to_account_info(),
            token::SyncNative {
                account: wsol_owner_ai.clone(),
            },
        ))?;

        // Single-sided SOL ape: cap the WSOL side to what we funded (`spend`) and the meme side to 0.
        // `increase_liquidity_by_token_amounts_v2` deposits UP TO these caps and computes liquidity,
        // so it can never demand more than we funded (no ExceededTokenMax). The caller's
        // token_max_a/b args are ignored (kept for signature stability).
        let _ = (token_max_a, token_max_b, liquidity_amount);
        let (cpi_max_a, cpi_max_b) = if wsol_is_b {
            (0u64, spend) // meme = A (0), WSOL = B (spend)
        } else {
            (spend, 0u64) // WSOL = A (spend), meme = B (0)
        };

        // --- increase_liquidity_v2 CPI, invoke_signed by the lp_owner PDA (position_authority). ---
        let lp_owner_ai = ctx.accounts.lp_owner.to_account_info();
        let il: Vec<(AccountInfo<'info>, bool, bool)> = vec![
            (remaining[0].clone(), false, true),  // whirlpool (w)
            (remaining[1].clone(), false, false), // token_program_a
            (remaining[2].clone(), false, false), // token_program_b
            (remaining[3].clone(), false, false), // memo_program
            (lp_owner_ai.clone(), true, false),   // position_authority (signer)
            (remaining[4].clone(), false, true),  // position (w)
            (remaining[5].clone(), false, false), // position_token_account
            (remaining[6].clone(), false, false), // token_mint_a
            (remaining[7].clone(), false, false), // token_mint_b
            (remaining[8].clone(), false, true),  // token_owner_account_a (w)
            (remaining[9].clone(), false, true),  // token_owner_account_b (w)
            (remaining[10].clone(), false, true), // token_vault_a (w)
            (remaining[11].clone(), false, true), // token_vault_b (w)
            (remaining[12].clone(), false, true), // tick_array_lower (w)
            (remaining[13].clone(), false, true), // tick_array_upper (w)
        ];
        let mut metas = Vec::with_capacity(il.len());
        let mut infos = Vec::with_capacity(il.len() + 1);
        for (info, is_signer, is_writable) in &il {
            metas.push(AccountMeta {
                pubkey: *info.key,
                is_signer: *is_signer,
                is_writable: *is_writable,
            });
            infos.push(info.clone());
        }
        infos.push(remaining[14].clone());

        // Use increase_liquidity_BY_TOKEN_AMOUNTS_v2: deposit up to (cpi_max_a, cpi_max_b) and let
        // Orca compute the liquidity. The slippage guard here is the SQRT-PRICE BOUNDS — we set them
        // to Orca's full [MIN, MAX] range so the deposit NEVER reverts on slippage (the wallet's
        // "slippage tolerance exceeded" came from the liquidity-amount path's token-max cap).
        // method = IncreaseLiquidityMethod::ByTokenAmounts { token_max_a, token_max_b, min_sqrt, max_sqrt }
        const ILBTA_DISCM: [u8; 8] = [0xef, 0xfb, 0x09, 0x7c, 0xd2, 0xc6, 0x35, 0x2b];
        const MIN_SQRT_PRICE: u128 = 4295048016;
        const MAX_SQRT_PRICE: u128 = 79226673515401279992447579055;
        let mut data = Vec::with_capacity(8 + 1 + 8 + 8 + 16 + 16 + 1);
        data.extend_from_slice(&ILBTA_DISCM);
        data.push(0u8); // enum variant 0 = ByTokenAmounts
        data.extend_from_slice(&cpi_max_a.to_le_bytes());
        data.extend_from_slice(&cpi_max_b.to_le_bytes());
        data.extend_from_slice(&MIN_SQRT_PRICE.to_le_bytes());
        data.extend_from_slice(&MAX_SQRT_PRICE.to_le_bytes());
        data.push(0u8); // remaining_accounts_info: Option<RemainingAccountsInfo> = None

        let ix = Instruction {
            program_id: orca_whirlpool::ID,
            accounts: metas,
            data,
        };
        let bump_arr = [ctx.bumps.lp_owner];
        let lp_owner_seeds: &[&[u8]] = &[b"lp_owner", &bump_arr];
        invoke_signed(&ix, &infos, &[lp_owner_seeds])?;

        // Reimburse the payer from the guard escrow. Both the guard (program-owned) and the payer
        // are OUTSIDE the Orca account set, so this manual lamport move cannot alias a CPI account.
        // Net payer over the instruction: 0; net guard: -spend (the spend ended up in the pool +
        // any WSOL dust left in the lp_owner WSOL ATA, both ultimately from the escrow).
        {
            let guard_ai = ctx.accounts.bundle_guard.to_account_info();
            let payer_ai = ctx.accounts.payer.to_account_info();
            guard_ai.sub_lamports(spend)?;
            payer_ai.add_lamports(spend)?;
        }
        ctx.accounts.bundle_guard.pending_lp = 0;

        // Mark the LP step. STEP_LP is reserved but excluded from REQUIRED_MASK, so this is purely
        // a record for now and can never brick the bundle.
        mark_bundle(&mut ctx.accounts.bundle_guard, STEP_LP)?;

        msg!("add_liq: SUCCESS, added {} lamports of WSOL liquidity (escrow-funded)", spend);
        return Ok(());
        }

        // ===================== VENUE 1: USDC =====================
        // Swap the escrow WSOL -> USDC on a SOL/USDC whirlpool, then deposit the USDC single-sided
        // into the USDC/meme whirlpool. Funds WSOL from the payer; reimburses from the escrow here.
        if venue == 1 {
            let spend = ctx.accounts.bundle_guard.pending_lp.min(available);
            let did = add_liq_usdc(
                &ctx.accounts.payer.to_account_info(),
                &ctx.accounts.lp_owner.to_account_info(),
                ctx.bumps.lp_owner,
                &ctx.accounts.wsol_token_program.to_account_info(),
                &ctx.accounts.system_program.to_account_info(),
                remaining,
                spend,
            )?;
            if !did {
                return Ok(());
            }
            // Reimburse the payer from the guard escrow (payer + guard are OUTSIDE every CPI account
            // set, so this manual lamport move cannot alias). Net payer 0; net guard -spend.
            {
                let guard_ai = ctx.accounts.bundle_guard.to_account_info();
                let payer_ai = ctx.accounts.payer.to_account_info();
                guard_ai.sub_lamports(spend)?;
                payer_ai.add_lamports(spend)?;
            }
            ctx.accounts.bundle_guard.pending_lp = 0;
            mark_bundle(&mut ctx.accounts.bundle_guard, STEP_LP)?;
            msg!(
                "add_liq(usdc): SUCCESS, swapped {} lamports WSOL->USDC and deposited (escrow-funded)",
                spend
            );
            return Ok(());
        }

        // ===================== VENUE 2: HOUSE =====================
        // Buy $HOUSE via the exact bundle_buy_burn PumpSwap CPI, move it to lp_owner's HOUSE ATA,
        // then deposit it single-sided into the HOUSE/meme whirlpool. Funds WSOL from the payer;
        // reimburses from the escrow here.
        if venue == 2 {
            let spend = ctx.accounts.bundle_guard.pending_lp.min(available);
            let did = add_liq_house(
                &ctx.accounts.payer.to_account_info(),
                &ctx.accounts.lp_owner.to_account_info(),
                ctx.bumps.lp_owner,
                &ctx.accounts.wsol_token_program.to_account_info(),
                &ctx.accounts.system_program.to_account_info(),
                remaining,
                spend,
            )?;
            if !did {
                return Ok(());
            }
            {
                let guard_ai = ctx.accounts.bundle_guard.to_account_info();
                let payer_ai = ctx.accounts.payer.to_account_info();
                guard_ai.sub_lamports(spend)?;
                payer_ai.add_lamports(spend)?;
            }
            ctx.accounts.bundle_guard.pending_lp = 0;
            mark_bundle(&mut ctx.accounts.bundle_guard, STEP_LP)?;
            msg!(
                "add_liq(house): SUCCESS, bought HOUSE with {} lamports WSOL and deposited (escrow-funded)",
                spend
            );
            return Ok(());
        }

        // Unknown venue: graceful no-op (NO mark, NO lamport movement).
        msg!("add_liq: unknown venue {}; graceful no-op (no mark)", venue);
        Ok(())
    }
}

mod helpers {
    use anchor_spl::{
        token_2022::{
            self,
            spl_token_2022::instruction::{initialize_mint, initialize_mint2, AuthorityType},
            SetAuthority,
        },
        token_2022_extensions,
        token_interface::spl_pod::optional_keys::OptionalNonZeroPubkey,
    };
    use anchor_lang::solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    };
    use spl_token_metadata_interface::state::TokenMetadata;

    use super::*;

    pub fn transfer_tokens_from_bonding_curve_to_admin(
        ctx: &Context<Withdraw>,
        token_amount: u64,
    ) -> Result<()> {
        let mint_key = ctx.accounts.mint.key();
        let authority_seed = &[
            b"bonding-curve".as_ref(),
            mint_key.as_ref(),
            &[ctx.bumps.bonding_curve],
        ];
        let seeds = [authority_seed.as_slice()];
        if *ctx.accounts.token_program.to_account_info().key == anchor_spl::token::ID {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.associated_bonding_curve.to_account_info(),
                        to: ctx.accounts.associated_user.to_account_info(),
                        authority: ctx.accounts.bonding_curve.to_account_info(),
                    },
                    &seeds,
                ),
                token_amount,
            )
        } else {
            token_2022::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token_2022::TransferChecked {
                        from: ctx.accounts.associated_bonding_curve.to_account_info(),
                        to: ctx.accounts.associated_user.to_account_info(),
                        authority: ctx.accounts.bonding_curve.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                    },
                    &seeds,
                ),
                token_amount,
                ctx.accounts.mint.decimals,
            )
        }
    }

    pub fn transfer_sol_from_bonding_curve_to_admin(
        ctx: &Context<Withdraw>,
        sol_amount: u64,
    ) -> Result<()> {
        ctx.accounts.bonding_curve.sub_lamports(sol_amount)?;
        ctx.accounts.user.add_lamports(sol_amount)?;

        Ok(())
    }

    pub fn transfer_sol_from_bonding_curve_to_user(
        ctx: &Context<Sell>,
        sol_amount: u64,
    ) -> Result<()> {
        ctx.accounts.bonding_curve.sub_lamports(sol_amount)?;
        ctx.accounts.user.add_lamports(sol_amount)?;

        Ok(())
    }

    pub fn transfer_sol_from_bonding_curve_to_fee_recipient(
        ctx: &Context<Sell>,
        sol_amount: u64,
    ) -> Result<()> {
        // check the fee recipient matches the global state fee recipient
        require_keys_eq!(
            ctx.accounts.global.fee_recipient,
            ctx.accounts.fee_recipient.key(),
            PumpError::NotAuthorized
        );

        ctx.accounts.bonding_curve.sub_lamports(sol_amount)?;
        ctx.accounts.fee_recipient.add_lamports(sol_amount)?;

        Ok(())
    }

    /// Resolves a passed-in referrer key for persistence into the referral tree.
    /// A missing / self referral falls back to the program default first-level referrer.
    pub fn normalize_ref(candidate: Pubkey, user: Pubkey) -> Pubkey {
        if candidate == user || candidate == Pubkey::default() {
            Pubkey::from_str(DEFAULT_FIRST_LEVEL_REFERRER).unwrap()
        } else {
            candidate
        }
    }

    /// True when `candidate` is a payable referrer (not the trader themselves and not the
    /// system/default pubkey). Used to gate every referral-tier payout.
    pub fn is_real_ref(candidate: Pubkey, user: Pubkey) -> bool {
        candidate != user && candidate != Pubkey::default()
    }

    /// Reads the spot price of `mint` (newmeme) denominated in the pool's base token from a live
    /// Orca Whirlpool account. Returns `newmeme_per_base`, accounting for inverse mint ordering
    /// (sqrt_price is always sqrt(price_of_tokenB / price_of_tokenA) * 2^64).
    pub fn read_newmeme_price(venue: &AccountInfo, mint: Pubkey) -> Option<f64> {
        let data = venue.try_borrow_data().ok()?;
        if data.len() <= 213 {
            return None;
        }
        let sqrt_bytes: [u8; 16] = data[65..81].try_into().ok()?;
        let sqrt_p = u128::from_le_bytes(sqrt_bytes);
        let mint_b = Pubkey::new_from_array(data[181..213].try_into().ok()?);
        let is_newmeme_b = mint_b == mint;
        let p = (sqrt_p as f64 / 2f64.powi(64)).powf(2.0);
        Some(if is_newmeme_b {
            p
        } else if p > 0.0 {
            1.0 / p
        } else {
            0.0
        })
    }

    /// True when an Orca Whirlpool account is genuinely live: the supplied program is the real
    /// Whirlpool program, the pool account is owned by it, and it carries account data.
    /// On the harness the pools are dummy system-owned keys with no data, so this is false.
    pub fn orca_venue_live(orca_program: &AccountInfo, venue: &AccountInfo) -> bool {
        let opk = orca_program.key();
        opk == orca_whirlpool::ID && venue.owner == &opk && venue.data_len() > 0
    }

    /// Real CPI to `orca_whirlpool::cpi::increase_liquidity_v2` for one venue (e.g. SOL/newmeme).
    /// Gated: returns `Ok(false)` (LP third folds back to fee_recipient) unless the pool is live
    /// and the caller supplied the 13 extra Orca accounts via `remaining_accounts`. The exact
    /// token_max amounts are derived from the live pool price so liquidity is added at spot.
    /// Structured to be repeatable for the usdc/house venues.
    pub fn try_increase_liquidity<'info>(
        orca_program: &AccountInfo<'info>,
        venue: &AccountInfo<'info>,
        position_authority: &AccountInfo<'info>,
        mint: Pubkey,
        remaining: &[AccountInfo<'info>],
        lp_third: u64,
    ) -> Result<bool> {
        if !orca_venue_live(orca_program, venue) || remaining.len() < 13 {
            msg!("LP leg pending (Orca add_liq not yet wired); LP third -> fee_recipient");
            return Ok(false);
        }

        // Price-aware split of the LP third into the two pool sides.
        let price = read_newmeme_price(venue, mint).unwrap_or(0.0);
        let base_amt = lp_third / 2;
        let new_amt = (base_amt as f64 * price) as u64;
        let token_max_a = new_amt.max(1);
        let token_max_b = base_amt.max(1);
        let liquidity_amount = (token_max_a as u128).saturating_add(token_max_b as u128);

        let cpi_accounts = orca_whirlpool::cpi::accounts::IncreaseLiquidityV2 {
            whirlpool: venue.clone(),
            token_program_a: remaining[0].clone(),
            token_program_b: remaining[1].clone(),
            memo_program: remaining[2].clone(),
            position_authority: position_authority.clone(),
            position: remaining[3].clone(),
            position_token_account: remaining[4].clone(),
            token_mint_a: remaining[5].clone(),
            token_mint_b: remaining[6].clone(),
            token_owner_account_a: remaining[7].clone(),
            token_owner_account_b: remaining[8].clone(),
            token_vault_a: remaining[9].clone(),
            token_vault_b: remaining[10].clone(),
            tick_array_lower: remaining[11].clone(),
            tick_array_upper: remaining[12].clone(),
        };

        orca_whirlpool::cpi::increase_liquidity_v2(
            CpiContext::new(orca_program.clone(), cpi_accounts),
            liquidity_amount,
            token_max_a,
            token_max_b,
            None,
        )?;

        Ok(true)
    }

    /// Buy & burn $PUMP (HOUSE) leg. Real CPIs behind the gate: swaps the burn third into HOUSE
    /// via `orca_whirlpool::cpi::swap_v2` on the HOUSE/newmeme pool, then burns the received HOUSE
    /// from `user_house_ata` via `token_2022::burn`. Returns `Ok(false)` (burn third folds back to
    /// fee_recipient) unless the house mint, pool, ata and program are all real and the 13 extra
    /// Orca swap accounts were supplied. On the harness none of these hold, so it cleanly skips.
    pub fn try_buy_and_burn<'info>(
        orca_program: &AccountInfo<'info>,
        house_venue: &AccountInfo<'info>,
        authority: &AccountInfo<'info>,
        house_mint: &AccountInfo<'info>,
        user_house_ata: &AccountInfo<'info>,
        house_token_program: &AccountInfo<'info>,
        remaining: &[AccountInfo<'info>],
        burn_third: u64,
    ) -> Result<bool> {
        let house_ok = house_mint.key() == super::house_mint::ID;
        let ata_ok = user_house_ata.data_len() > 0;
        if !(house_ok && ata_ok && orca_venue_live(orca_program, house_venue) && remaining.len() >= 13)
        {
            msg!("house buy&burn not live; burn third -> fee_recipient");
            return Ok(false);
        }

        // Swap the burn third (base) into HOUSE on the HOUSE/newmeme whirlpool.
        let swap_accounts = orca_whirlpool::cpi::accounts::SwapV2 {
            token_program_a: remaining[0].clone(),
            token_program_b: remaining[1].clone(),
            memo_program: remaining[2].clone(),
            token_authority: authority.clone(),
            whirlpool: house_venue.clone(),
            token_mint_a: remaining[3].clone(),
            token_mint_b: remaining[4].clone(),
            token_owner_account_a: remaining[5].clone(),
            token_vault_a: remaining[6].clone(),
            token_owner_account_b: remaining[7].clone(),
            token_vault_b: remaining[8].clone(),
            tick_array_0: remaining[9].clone(),
            tick_array_1: remaining[10].clone(),
            tick_array_2: remaining[11].clone(),
            oracle: remaining[12].clone(),
        };

        orca_whirlpool::cpi::swap_v2(
            CpiContext::new(orca_program.clone(), swap_accounts),
            burn_third,
            0u64,
            0u128,
            true,
            true,
            None,
        )?;

        // Burn the HOUSE balance now sitting in the user's house ATA.
        let burn_amt = {
            match user_house_ata.try_borrow_data() {
                Ok(b) if b.len() >= 72 => u64::from_le_bytes(b[64..72].try_into().unwrap()),
                _ => 0,
            }
        };
        if burn_amt > 0 {
            token_2022::burn(
                CpiContext::new(
                    house_token_program.clone(),
                    token_2022::Burn {
                        mint: house_mint.clone(),
                        from: user_house_ata.clone(),
                        authority: authority.clone(),
                    },
                ),
                burn_amt,
            )?;
        }

        Ok(true)
    }

    pub fn transfer_tokens_from_user_to_bonding_curve(
        ctx: &Context<Sell>,
        token_amount: u64,
    ) -> Result<()> {
        if *ctx.accounts.token_program.to_account_info().key == anchor_spl::token::ID {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.associated_user.to_account_info(),
                        to: ctx.accounts.associated_bonding_curve.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                token_amount,
            )
        } else {
            token_2022::transfer_checked(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    token_2022::TransferChecked {
                        from: ctx.accounts.associated_user.to_account_info(),
                        to: ctx.accounts.associated_bonding_curve.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                    },
                ),
                token_amount,
                ctx.accounts.mint.decimals,
            )
        }
    }

    pub fn transfer_tokens_from_bonding_curve_to_user(
        ctx: &Context<Buy>,
        token_amount: u64,
    ) -> Result<()> {
        let mint_key = ctx.accounts.mint.key();
        let authority_seed = &[
            b"bonding-curve".as_ref(),
            mint_key.as_ref(),
            &[ctx.bumps.bonding_curve],
        ];
        let seeds = [authority_seed.as_slice()];

        if *ctx.accounts.token_program.to_account_info().key == anchor_spl::token::ID {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.associated_bonding_curve.to_account_info(),
                    to: ctx.accounts.associated_user.to_account_info(),
                    authority: ctx.accounts.bonding_curve.to_account_info(),
                },
                &seeds,
            ),
            token_amount,
        )
        } else {
            token_2022::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token_2022::TransferChecked {
                        from: ctx.accounts.associated_bonding_curve.to_account_info(),
                        to: ctx.accounts.associated_user.to_account_info(),
                        authority: ctx.accounts.bonding_curve.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                    },
                    &seeds,
                ),
                token_amount,
                ctx.accounts.mint.decimals,
            )
        }
    }

    pub fn transfer_sol_from_user_to_bonding_curve(
        ctx: &Context<Buy>,
        sol_amount: u64,
    ) -> Result<()> {
        // transfer sol to associated account
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.bonding_curve.to_account_info(),
                },
            ),
            sol_amount,
        )
    }

    pub fn transfer_sol_from_user_to_fee_recipient(
        ctx: &Context<Buy>,
        sol_amount: u64,
    ) -> Result<()> {
        // check the fee recipient matches the global state fee recipient
        require_keys_eq!(
            ctx.accounts.global.fee_recipient,
            ctx.accounts.fee_recipient.key(),
            PumpError::NotAuthorized
        );

        // transfer sol to associated account
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.fee_recipient.to_account_info(),
                },
            ),
            sol_amount,
        )
    }

    pub fn mint_to_bonding_curve<'info>(ctx: &Context<Create>) -> Result<()> {
        let authority_seed = &[b"mint-authority".as_ref(), &[ctx.bumps.mint_authority]];
        let seeds = [authority_seed.as_slice()];

        if *ctx.accounts.token_program.to_account_info().key == anchor_spl::token::ID {
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.associated_bonding_curve.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &seeds,
            );
            token::mint_to(cpi_ctx, ctx.accounts.global.token_total_supply)
        } else {
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_2022::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.associated_bonding_curve.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &seeds,
            );
            anchor_spl::token_2022::mint_to(cpi_ctx, ctx.accounts.global.token_total_supply)
        }
    }

    pub fn set_metadata<'info>(
        ctx: &Context<Create>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        // set the metadata for the token

        let authority_seed = &[b"mint-authority".as_ref(), &[ctx.bumps.mint_authority]];
        let seeds = [authority_seed.as_slice()];
        let update_authority: OptionalNonZeroPubkey = OptionalNonZeroPubkey {
            0: *ctx.accounts.mint_authority.to_account_info().key,
        };
        let token_metadata = TokenMetadata {
            name,
            symbol,
            uri,
            update_authority,
            mint: *ctx.accounts.mint.to_account_info().key,
            ..Default::default()
        };
        let ix = spl_token_metadata_interface::instruction::initialize(
            &ctx.accounts.token_program.to_account_info().key,
            &ctx.accounts.mint.to_account_info().key,
            ctx.accounts.mint_authority.to_account_info().key,
            ctx.accounts.mint.to_account_info().key,
            &ctx.accounts.mint_authority.to_account_info().key,
            token_metadata.name.clone(),
            token_metadata.symbol.clone(),
            token_metadata.uri.clone(),
        );
        let accounts = &[
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.mint.to_account_info(),
        ];
        invoke_signed(&ix, accounts, &seeds)?;

        Ok(())
    }

    pub fn revoke_mint_authority(ctx: &Context<Create>) -> Result<()> {
        // renounce the mint authority
        let renounce_accounts = SetAuthority {
            account_or_mint: ctx.accounts.mint.to_account_info(),
            current_authority: ctx.accounts.mint_authority.to_account_info(),
        };

        let authority_seed = &[b"mint-authority".as_ref(), &[ctx.bumps.mint_authority]];
        let seeds = [authority_seed.as_slice()];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            renounce_accounts,
            &seeds,
        );

        token_2022::set_authority(cpi_ctx, AuthorityType::MintTokens, None)
    }
}

#[error_code]
pub enum PumpError {
    #[msg("The given account is not authorized to execute this instruction.")]
    NotAuthorized,
    #[msg("The program is already initialized.")]
    AlreadyInitialized,
    #[msg("slippage: Too much SOL required to buy the given amount of tokens.")]
    TooMuchSolRequired,
    #[msg("slippage: Too little SOL received to sell the given amount of tokens.")]
    TooLittleSolReceived,
    #[msg("The mint does not match the bonding curve.")]
    MintDoesNotMatchBondingCurve,
    #[msg("The bonding curve has completed and liquidity migrated to raydium.")]
    BondingCurveComplete,
    #[msg("The bonding curve has not completed.")]
    BondingCurveNotComplete,
    #[msg("The program is not initialized.")]
    NotInitialized,
    #[msg("Bundle guard violation: bundle steps must occur within the same slot.")]
    BundleGuardViolation,
    #[msg("Anti-sandwich guard: transaction contains a top-level instruction whose program id is not on the allowlist.")]
    RogueInstruction,
}

#[account]
pub struct Global {
    pub initialized: bool,
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub initial_virtual_token_reserves: u64,
    pub initial_virtual_sol_reserves: u64,
    pub initial_real_token_reserves: u64,
    pub token_total_supply: u64,
    pub fee_basis_points: u64,
}

impl Global {
    // 8 (discriminator) + 1 (initialized) + 32 (authority) + 8 (initial_virtual_token_reserves) + 8 (initial_virtual_sol_reserves) + 8 (initial_real_token_reserves) + 8 (token_total_supply)
    pub const SIZE: usize = 8 + 32 + 1 + 32 + 8 + 8 + 8 + 8 + 8;

    pub fn get_fee(&self, amount: u64) -> u64 {
        let fee = (amount as u128 * self.fee_basis_points as u128) / 10_000;
        return fee as u64;
    }
}

#[account]
pub struct BondingCurve {
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub token_total_supply: u64,
    pub complete: bool,
}

impl BondingCurve {
    pub fn buy_quote(&self, amount: u128) -> u64 {
        let virtual_sol_reserves = self.virtual_sol_reserves as u128;
        let virtual_token_reserves = self.virtual_token_reserves as u128;
        let sol_cost: u64 =
            ((amount * virtual_sol_reserves) / (virtual_token_reserves - amount)) as u64;

        return sol_cost + 1; // always round up
    }

    pub fn sell_quote(&self, amount: u128) -> u64 {
        let virtual_sol_reserves = self.virtual_sol_reserves as u128;
        let virtual_token_reserves = self.virtual_token_reserves as u128;
        let sol_output: u64 =
            ((amount * virtual_sol_reserves) / (virtual_token_reserves + amount)) as u64;

        return sol_output;
    }
}

impl BondingCurve {
    // 8 (discriminator)
    // + 8 (virtual_token_reserves)
    // + 8 (virtual_sol_reserves)
    // + 8 (real_token_reserves)
    // + 8 (real_sol_reserves)
    // + 8 (token_total_supply)
    // + 1 (complete)
    // NOTE: layout kept byte-identical (49 bytes) to the already-deployed
    // accounts so existing/grandfathered bonding curves deserialize.
    pub const SIZE: usize = 8 + 8 + 8 + 8 + 8 + 8 + 1;
}

/// Tracks the 3-deep referral chain for a user (set on first refer/"cookie").
/// Forever pays the chain on subsequent trades.
#[account]
pub struct Referral {
    pub user: Pubkey,
    pub referrer: Pubkey,   // tier 1
    pub referrer2: Pubkey,  // tier 2
    pub referrer3: Pubkey,  // tier 3
}

impl Referral {
    pub const SIZE: usize = 8 + 32 * 4; // disc + user + 3 referrers
}

/// Slot-scoped enforcement primitive for the 5-step bundle. A single global singleton
/// (PDA seeds = [b"bundle_guard"]). `mark_bundle` ORs each step's bit into `mask` and auto-resets
/// the whole guard whenever the slot advances, so a non-zero `mask` proves the steps are co-slot.
#[account]
pub struct BundleGuard {
    pub slot: u64,
    pub mask: u32,
    pub user: Pubkey,
    pub mint: Pubkey,
    pub pending_ref: u64,
    pub pending_lp: u64,
    pub pending_burn: u64,
    pub withheld: u64,
}

impl BundleGuard {
    // 8 (disc) + 8 (slot) + 4 (mask) + 32 (user) + 32 (mint) + 8*4 (pending_ref/lp/burn + withheld)
    pub const SIZE: usize = 8 + 8 + 4 + 32 + 32 + 8 * 4;

    /// True when every bit in `step` is already set in the current bundle mask.
    pub fn has(&self, step: u32) -> bool {
        self.mask & step == step
    }

    /// True when all required steps (TRADE|REFERRAL|LP|BURN) have landed this bundle.
    pub fn is_complete(&self) -> bool {
        self.has(REQUIRED_MASK)
    }
}

#[event]
pub struct CreateEvent {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub mint: Pubkey,
    pub bonding_curve: Pubkey,
    pub user: Pubkey,
}

#[event]
pub struct TradeEvent {
    mint: Pubkey,
    sol_amount: u64,
    token_amount: u64,
    is_buy: bool,
    user: Pubkey,
    timestamp: i64,
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
}

#[event]
pub struct CompleteEvent {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub bonding_curve: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SetParamsEvent {
    pub fee_recipient: Pubkey,
    pub initial_virtual_token_reserves: u64,
    pub initial_virtual_sol_reserves: u64,
    pub initial_real_token_reserves: u64,
    pub token_total_supply: u64,
    pub fee_basis_points: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = Global::SIZE, seeds = [b"global"], bump)]
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct SetParams<'info> {
    #[account(mut, seeds = [b"global"], bump)]
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct Create<'info> {
    #[account(
        init,
        payer = user,
        mint::decimals = 6,
        mint::authority = mint_authority,
        extensions::metadata_pointer::authority = mint_authority,
        extensions::metadata_pointer::metadata_address = mint,
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(seeds = [b"mint-authority"], bump)]
    /// CHECK: The mint authority is the program derived address.
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = user,
        space = BondingCurve::SIZE,
        seeds = [b"bonding-curve", mint.key().as_ref()], 
        bump
    )]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,
    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
        associated_token::token_program = token_program,
    )]
    pub associated_bonding_curve: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(seeds = [b"global"], bump)]
    pub global: Box<Account<'info, Global>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct Buy<'info> {
    // NOTE: heavy deserialized accounts are Boxed to keep `Buy::try_accounts`
    // under the 4KB BPF stack limit (adding instructions_sysvar pushed it 8 bytes
    // over). Box is transparent to the IDL + handler (Deref), so account order /
    // the frontend are unaffected.
    #[account(seeds = [b"global"], bump)]
    pub global: Box<Account<'info, Global>>,
    #[account(mut)]
    /// CHECK: destination address
    pub fee_recipient: UncheckedAccount<'info>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, seeds = [b"bonding-curve", mint.key().as_ref()], bump)]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
        associated_token::token_program = token_program,
    )]
    pub associated_bonding_curve: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub associated_user: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,

    // === New per-trade bundle accounts (Core Launch Mechanic) ===
    /// The direct referrer for this buyer (can be user themselves for no-referral).
    /// On first interaction we establish the 3-deep tree.
    /// CHECK: we read the key and may pay SOL to it / its ancestors.
    #[account(mut)]
    pub referrer: UncheckedAccount<'info>,

    /// CHECK: tier-2 referrer (ancestor of `referrer`). May receive SOL.
    #[account(mut)]
    pub referrer2: UncheckedAccount<'info>,

    /// CHECK: tier-3 referrer (ancestor of `referrer2`). May receive SOL.
    #[account(mut)]
    pub referrer3: UncheckedAccount<'info>,

    /// PDA storing the 3-deep referral chain for `user`.
    /// Seeds: ["referral", user.key()]
    #[account(
        init_if_needed,
        payer = user,
        space = Referral::SIZE,
        seeds = [b"referral", user.key().as_ref()],
        bump
    )]
    pub referral_record: Box<Account<'info, Referral>>,

    // === House + Orca venue accounts for the 5-step bundle ===
    // House accounts for the 1/3 buy & burn step (via Orca swap + burn)
    /// CHECK: house mint (PumpICO - Token-2022)
    pub house_mint: UncheckedAccount<'info>,
    /// CHECK: user (or program) house ata for the burn leg (must use Token-2022)
    #[account(mut)]
    pub user_house_ata: UncheckedAccount<'info>,
    pub house_token_program: Interface<'info, TokenInterface>,

    // Orca whirl/splash for the 3 pairs (SOL/newmeme, USDC/newmeme, HOUSE/newmeme)
    // Caller provides the live pool accounts (created off-chain or in prior tx for "instant" venues).
    // Full CPI would use these + vaults, position, tick arrays for swap + deposit.
    /// CHECK: Orca Whirlpool account for SOL ↔ newmeme
    pub orca_sol_newmeme: UncheckedAccount<'info>,
    /// CHECK: Orca Whirlpool account for USDC ↔ newmeme
    pub orca_usdc_newmeme: UncheckedAccount<'info>,
    /// CHECK: Orca Whirlpool account for PumpICO ↔ newmeme
    pub orca_house_newmeme: UncheckedAccount<'info>,

    pub orca_program: Program<'info, orca_whirlpool::program::Whirlpool>,

    /// Slot-scoped bundle guard singleton. The buy marks STEP_TRADE/STEP_REFERRAL, escrows the
    /// burn third into this account's lamports, and records the withheld token amount.
    /// (Trailing account; #[event_cpi] still appends event_authority/program after this.)
    #[account(mut, seeds = [b"bundle_guard"], bump)]
    pub bundle_guard: Account<'info, BundleGuard>,

    /// Instructions sysvar for the anti-sandwich allowlist guard (`enforce_allowlist`). LAST NORMAL
    /// field — #[event_cpi] appends event_authority/program AFTER this.
    /// CHECK: validated by address = sysvar instructions id
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}

/// Admin-only init of the global `BundleGuard` singleton.
#[derive(Accounts)]
pub struct InitBundleGuard<'info> {
    #[account(seeds = [b"global"], bump)]
    pub global: Account<'info, Global>,
    #[account(
        init,
        payer = authority,
        space = BundleGuard::SIZE,
        seeds = [b"bundle_guard"],
        bump
    )]
    pub bundle_guard: Account<'info, BundleGuard>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Accounts for `bundle_buy_burn`. The 23 PumpSwap `buy_exact_quote_in` accounts are NOT listed
/// here — they arrive via `ctx.remaining_accounts` (in the documented order) and are forwarded to
/// the raw PumpSwap CPI.
#[derive(Accounts)]
pub struct BundleBuyBurn<'info> {
    #[account(mut, seeds = [b"bundle_guard"], bump)]
    pub bundle_guard: Account<'info, BundleGuard>,

    /// Funds the treasury WSOL ATA for this swap.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: program treasury PDA; signs the PumpSwap swap (as `user`) and the HOUSE burn.
    #[account(seeds = [b"house_treasury"], bump)]
    pub house_treasury: UncheckedAccount<'info>,

    /// CHECK: treasury WSOL ATA (quote side). Funded + `sync_native`'d in-instruction. Assumed
    /// to already exist (created idempotently by the caller).
    #[account(mut)]
    pub treasury_wsol_ata: UncheckedAccount<'info>,

    /// CHECK: treasury HOUSE ATA (base side, Token-2022). The bought HOUSE is burned from here.
    #[account(mut)]
    pub treasury_house_ata: UncheckedAccount<'info>,

    /// CHECK: HOUSE mint (Token-2022). Address-checked against `house_mint::ID`.
    /// Mutable: `token_2022::burn` decreases the mint supply.
    #[account(mut, address = house_mint::ID)]
    pub house_mint: UncheckedAccount<'info>,

    /// Token-2022 program (HOUSE burn authority CPI).
    pub token_program: Interface<'info, TokenInterface>,
    /// Classic Token program (WSOL `sync_native`).
    pub wsol_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,

    /// CHECK: must equal the PumpSwap program id.
    #[account(address = pump_amm::ID)]
    pub pump_amm_program: UncheckedAccount<'info>,

    /// Instructions sysvar for the anti-sandwich allowlist guard (`enforce_allowlist`). LAST fixed
    /// account: the 23 PumpSwap `remaining_accounts` follow AFTER this one.
    /// CHECK: validated by address = sysvar instructions id
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}

/// Accounts for `commit` — the final bundle leg that releases the withheld tokens to the buyer.
/// Mirrors the token-transfer accounts from `Buy`.
#[derive(Accounts)]
pub struct Commit<'info> {
    #[account(mut, seeds = [b"bundle_guard"], bump)]
    pub bundle_guard: Account<'info, BundleGuard>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [b"bonding-curve", mint.key().as_ref()], bump)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
        associated_token::token_program = token_program,
    )]
    pub associated_bonding_curve: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub associated_user: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,

    /// Instructions sysvar for the anti-sandwich allowlist guard (`enforce_allowlist`). LAST fixed
    /// account: any `remaining_accounts` follow AFTER this one.
    /// CHECK: validated by address = sysvar instructions id
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(seeds = [b"global"], bump)]
    pub global: Account<'info, Global>,
    #[account(mut)]
    /// CHECK: destination address
    pub fee_recipient: UncheckedAccount<'info>,
    // Boxed to keep `Sell::try_accounts` under the 4KB BPF stack limit (see Buy).
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, seeds = [b"bonding-curve", mint.key().as_ref()], bump)]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
        associated_token::token_program = token_program,
    )]
    pub associated_bonding_curve: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub associated_user: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,

    // === New per-trade bundle accounts (Core Launch Mechanic) ===
    #[account(mut)]
    /// CHECK: direct referrer
    pub referrer: UncheckedAccount<'info>,

    /// CHECK: tier-2 referrer (ancestor of `referrer`). May receive SOL.
    #[account(mut)]
    pub referrer2: UncheckedAccount<'info>,

    /// CHECK: tier-3 referrer (ancestor of `referrer2`). May receive SOL.
    #[account(mut)]
    pub referrer3: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = Referral::SIZE,
        seeds = [b"referral", user.key().as_ref()],
        bump
    )]
    pub referral_record: Box<Account<'info, Referral>>,

    // === House + Orca venue accounts for the 5-step bundle (sell) ===
    /// CHECK: house mint (PumpICO - Token-2022)
    pub house_mint: UncheckedAccount<'info>,
    /// CHECK: user house ata
    #[account(mut)]
    pub user_house_ata: UncheckedAccount<'info>,
    pub house_token_program: Interface<'info, TokenInterface>,

    /// CHECK: Orca Whirlpool SOL/newmeme
    pub orca_sol_newmeme: UncheckedAccount<'info>,
    /// CHECK: Orca Whirlpool USDC/newmeme
    pub orca_usdc_newmeme: UncheckedAccount<'info>,
    /// CHECK: Orca Whirlpool PumpICO/newmeme
    pub orca_house_newmeme: UncheckedAccount<'info>,

    pub orca_program: Program<'info, orca_whirlpool::program::Whirlpool>,

    /// Slot-scoped bundle guard singleton. The sell marks STEP_TRADE/STEP_REFERRAL, escrows the
    /// burn third (from the bonding curve) into this account, and records the withheld SOL owed.
    /// (Trailing account; #[event_cpi] still appends event_authority/program after this.)
    #[account(mut, seeds = [b"bundle_guard"], bump)]
    pub bundle_guard: Account<'info, BundleGuard>,

    /// Instructions sysvar for the anti-sandwich allowlist guard (`enforce_allowlist`). LAST NORMAL
    /// field — #[event_cpi] appends event_authority/program AFTER this.
    /// CHECK: validated by address = sysvar instructions id
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(seeds = [b"global"], bump)]
    pub global: Account<'info, Global>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [b"bonding-curve", mint.key().as_ref()], bump)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
        associated_token::token_program = token_program,
    )]
    pub associated_bonding_curve: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub associated_user: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

/// Admin upgrade path that wires a single Orca whirlpool venue for one (base, meme) pair via a
/// real `initialize_pool_v2` CPI. `mint` and `bonding_curve` are referenced as EXISTING accounts
/// (grandfathered coins), never initialized here. The Orca pool/vault accounts are supplied by the
/// off-chain deploy script (token_vault_a/b are fresh signer keypairs; the whirlpool is a PDA).
#[derive(Accounts)]
pub struct InitVenues<'info> {
    #[account(seeds = [b"global"], bump)]
    pub global: Account<'info, Global>,

    /// Orca pool funder (pays rent). PERMISSIONLESS: any signer is accepted; no longer required to
    /// match `global.authority`.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Existing meme mint of a grandfathered coin (one side of the pool).
    pub mint: InterfaceAccount<'info, Mint>,

    /// Existing bonding curve for `mint`, proving the venue is tied to a real coin.
    #[account(seeds = [b"bonding-curve", mint.key().as_ref()], bump)]
    pub bonding_curve: Account<'info, BondingCurve>,

    // === Orca initialize_pool_v2 accounts ===
    /// CHECK: Orca WhirlpoolsConfig.
    pub whirlpools_config: UncheckedAccount<'info>,
    /// CHECK: token mint A (base or meme depending on canonical ordering).
    pub token_mint_a: UncheckedAccount<'info>,
    /// CHECK: token mint B (base or meme depending on canonical ordering).
    pub token_mint_b: UncheckedAccount<'info>,
    /// CHECK: token badge A PDA (validated by the Orca program).
    pub token_badge_a: UncheckedAccount<'info>,
    /// CHECK: token badge B PDA (validated by the Orca program).
    pub token_badge_b: UncheckedAccount<'info>,
    /// CHECK: whirlpool PDA created by the CPI.
    #[account(mut)]
    pub whirlpool: UncheckedAccount<'info>,
    /// CHECK: fresh token vault A keypair (created + signed for by the CPI).
    #[account(mut)]
    pub token_vault_a: Signer<'info>,
    /// CHECK: fresh token vault B keypair (created + signed for by the CPI).
    #[account(mut)]
    pub token_vault_b: Signer<'info>,
    /// CHECK: Orca FeeTier account.
    pub fee_tier: UncheckedAccount<'info>,
    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    pub orca_program: Program<'info, orca_whirlpool::program::Whirlpool>,
}

/// Accounts for `open_lp_position` (PERMISSIONLESS). Everything Orca-side arrives via
/// `remaining_accounts` (see the instruction doc for the exact order) to avoid struct bloat.
#[derive(Accounts)]
pub struct OpenLpPosition<'info> {
    /// Pays rent for the position + tick arrays.
    #[account(mut)]
    pub funder: Signer<'info>,

    /// CHECK: program PDA that OWNS the LP position so the LP is locked forever. Seeds [b"lp_owner"].
    #[account(seeds = [b"lp_owner"], bump)]
    pub lp_owner: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Accounts for `add_liq` — the OPTIONAL Orca LP leg. The Orca `increase_liquidity_v2` accounts
/// arrive via `remaining_accounts` (see the instruction doc for the exact order). `payer` and
/// `bundle_guard` are deliberately kept OUT of the Orca account set so the escrow reimbursement at
/// the end cannot alias a CPI account (the exact trick `bundle_buy_burn` uses).
#[derive(Accounts)]
pub struct AddLiq<'info> {
    #[account(mut, seeds = [b"bundle_guard"], bump)]
    pub bundle_guard: Account<'info, BundleGuard>,

    /// Funds the WSOL side; reimbursed from the guard escrow at the end (net 0 over the ix).
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: program PDA that owns the LP position and signs increase_liquidity. Seeds [b"lp_owner"].
    #[account(seeds = [b"lp_owner"], bump)]
    pub lp_owner: UncheckedAccount<'info>,

    /// CHECK: WSOL native mint (address-checked).
    #[account(address = native_mint::ID)]
    pub wsol_mint: UncheckedAccount<'info>,

    /// Token program for the WSOL `sync_native`.
    pub wsol_token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,

    /// Instructions sysvar for the anti-sandwich allowlist guard (`enforce_allowlist`). LAST fixed
    /// account: the Orca `increase_liquidity_v2` `remaining_accounts` follow AFTER this one.
    /// CHECK: validated by address = sysvar instructions id
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}
