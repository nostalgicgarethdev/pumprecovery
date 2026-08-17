import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import BN from "bn.js";

/**
 * Create-time Orca venue + program-owned LP position opener.
 *
 * After a new pump coin is created, this opens — for each of the 3 quote bases
 * (wSOL / USDC / HOUSE) — the Orca whirlpool venue (`init_venues`) and a
 * program-PDA-owned, single-sided LP position (`open_lp_position`). The creator
 * signs + pays rent. Both instructions are ALREADY DEPLOYED + PERMISSIONLESS.
 *
 * The exact derivations + account layouts are ported from the mainnet-verified
 * reference scripts and cross-checked against the deployed program / IDL:
 *   - pump-contracts-solana/scripts/grandfather-venues.js  (init_venues)
 *   - pump-contracts-solana/scripts/open-lp-positions.js   (open_lp_position)
 *
 * init_venues (initialize_pool_v2 CPI) is HEAVY, so it cannot share a tx with
 * open_lp_position (combined ~1331 bytes > 1232 limit). We therefore send TWO
 * v0 transactions per base: [..init_venues] then [..open_lp_position], with the
 * open tx fired only after the init tx confirms (the position needs the pool to
 * exist on-chain). Bases run in parallel; a failure on one base never blocks
 * the others — and the coin itself is already created before any of this runs.
 *
 * NOTE ON REGISTRY: this does NOT write constants/lpPositions.json (a build-time
 * import). The new positions only become usable by the per-trade `add_liq` leg
 * once the backend registry / indexer is refreshed (e.g. re-running
 * open-lp-positions.js to re-derive the entry, which also creates the lp_owner
 * token ATAs add_liq needs). Opening the pool + position at create time is the
 * important, time-sensitive part; add_liq activation is a follow-up refresh.
 */

// --- Verified mainnet constants ---
export const PUMP_PROGRAM = new PublicKey(
  "67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV"
);
const ORCA_PROGRAM = new PublicKey(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
);
const WHIRLPOOLS_CONFIG = new PublicKey(
  "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ"
);
// Orca FeeTier for tick spacing 64 (0.3%).
const FEE_TIER_TS64 = new PublicKey(
  "HT55NVGVTjWmWLjV7BrSMPVZ7ppU8T2xE5nCAZ6YaGad"
);
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const HOUSE_MINT = new PublicKey(
  "Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump"
);

const TICK_SPACING = 64;
const TICKS_PER_ARRAY = TICK_SPACING * 88; // 5632 = one tick-array span

// Anchor discriminators = sha256("global:<name>")[0..8]. Hardcoded (so we don't
// pull a sha256 impl into the browser bundle) and verified byte-for-byte against
// the deployed target/idl/pump.json.
//   init_venues      => 29240ff3d4b1b50a
//   open_lp_position => a2c00a9844feb7c6
const DISC_INIT_VENUES = Buffer.from([41, 36, 15, 243, 212, 177, 181, 10]);
const DISC_OPEN_LP_POSITION = Buffer.from([162, 192, 10, 152, 68, 254, 183, 198]);

// 2^64 as a float, for Q64.64 sqrt-price -> tick conversion.
const TWO_POW_64 = Math.pow(2, 64);

// Rough one-time rent the CREATOR pays, per base (whirlpool + 2 vaults + position
// + position mint/ATA + 2 Orca tick arrays @ ~0.0704 SOL each). Tick arrays
// dominate. ~0.156 SOL/base -> ~0.47 SOL for all 3 bases.
export const RENT_PER_BASE_SOL = 0.156;
export const ESTIMATED_RENT_SOL = RENT_PER_BASE_SOL * 3; // ~0.47 SOL

interface BaseSpec {
  key: string;
  label: string;
  mint: PublicKey;
}
const BASES: BaseSpec[] = [
  { key: "sol", label: "wSOL", mint: WSOL_MINT },
  { key: "usdc", label: "USDC", mint: USDC_MINT },
  { key: "house", label: "HOUSE", mint: HOUSE_MINT },
];

// --- small helpers ---
const findPda = (seeds: (Buffer | Uint8Array)[], programId: PublicKey) =>
  PublicKey.findProgramAddressSync(seeds, programId)[0];

const u16le = (n: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
};
const i32le = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeInt32LE(n, 0);
  return b;
};
const u128le = (n: BN) => n.toArrayLike(Buffer, "le", 16);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Orca requires token_mint_a < token_mint_b by byte order. */
const sortMints = (a: PublicKey, b: PublicKey): [PublicKey, PublicKey] =>
  Buffer.compare(a.toBuffer(), b.toBuffer()) < 0 ? [a, b] : [b, a];

/** wSOL + USDC are classic SPL Token; meme + HOUSE are Token-2022. */
const tokenProgramForMint = (mint: PublicKey) =>
  mint.equals(WSOL_MINT) || mint.equals(USDC_MINT)
    ? TOKEN_PROGRAM_ID
    : TOKEN_2022_PROGRAM_ID;

const deriveWhirlpool = (mintA: PublicKey, mintB: PublicKey) =>
  findPda(
    [
      Buffer.from("whirlpool"),
      WHIRLPOOLS_CONFIG.toBuffer(),
      mintA.toBuffer(),
      mintB.toBuffer(),
      u16le(TICK_SPACING),
    ],
    ORCA_PROGRAM
  );

const deriveTokenBadge = (mint: PublicKey) =>
  findPda(
    [Buffer.from("token_badge"), WHIRLPOOLS_CONFIG.toBuffer(), mint.toBuffer()],
    ORCA_PROGRAM
  );

// Orca tick-array PDA seed is the ASCII string of the start index (NOT a LE int).
const deriveTickArray = (whirlpool: PublicKey, startIndex: number) =>
  findPda(
    [Buffer.from("tick_array"), whirlpool.toBuffer(), Buffer.from(String(startIndex))],
    ORCA_PROGRAM
  );

const tickArrayStart = (tick: number) =>
  Math.floor(tick / TICKS_PER_ARRAY) * TICKS_PER_ARRAY;

/** Integer sqrt over BN (Newton's method) — no BigInt (target es5). */
function isqrtBN(n: BN): BN {
  if (n.isNeg()) throw new Error("isqrtBN: negative");
  if (n.isZero()) return new BN(0);
  let x = new BN(1).ushln(Math.ceil(n.bitLength() / 2));
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const y = x.add(n.div(x)).ushrn(1);
    if (y.gte(x)) break;
    x = y;
  }
  return x;
}

/**
 * Q64.64 initial sqrt price (port of grandfather-venues.js computeInitialSqrtPrice).
 * Only the wSOL pair gets a real price from the bonding-curve virtual reserves;
 * USDC/HOUSE (or missing reserves) fall back to the documented price=1.0
 * placeholder (1 << 64). Orca sqrtPrice = floor(sqrt(B_atoms / A_atoms) * 2^64).
 */
function computeInitialSqrtPriceX64(
  baseMint: PublicKey,
  mintA: PublicKey,
  vSol?: BN | null,
  vTokens?: BN | null
): BN {
  if (
    baseMint.equals(WSOL_MINT) &&
    vSol &&
    vTokens &&
    !vSol.isZero() &&
    !vTokens.isZero()
  ) {
    const aIsBase = mintA.equals(baseMint);
    const num = aIsBase ? vTokens : vSol;
    const den = aIsBase ? vSol : vTokens;
    return isqrtBN(num.ushln(128).div(den));
  }
  return new BN(1).ushln(64); // price = 1.0 placeholder
}

/** Convert a Q64.64 sqrt price into the pool's (approx) current tick index. */
function sqrtX64ToTick(sqrtX64: BN): number {
  const sp = Number(sqrtX64.toString()) / TWO_POW_64;
  const price = sp * sp;
  if (!isFinite(price) || price <= 0) return 0;
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * Single-sided range so ONLY the base token is deposited (generalized from the
 * wSOL rule in open-lp-positions.js):
 *   base == token A  -> range ABOVE current tick (deposit only token A)
 *   base == token B  -> range BELOW current tick (deposit only token B)
 */
function singleSidedRange(baseIsA: boolean, tickCurrent: number) {
  const span = TICKS_PER_ARRAY;
  let tickLowerIndex: number;
  let tickUpperIndex: number;
  if (baseIsA) {
    tickLowerIndex =
      Math.ceil(tickCurrent / TICK_SPACING) * TICK_SPACING + TICK_SPACING;
    tickUpperIndex = tickLowerIndex + span;
  } else {
    tickUpperIndex =
      Math.floor(tickCurrent / TICK_SPACING) * TICK_SPACING - TICK_SPACING;
    tickLowerIndex = tickUpperIndex - span;
  }
  return { tickLowerIndex, tickUpperIndex };
}

// --- instruction builders ---

const m = (pubkey: PublicKey, isWritable: boolean, isSigner = false) => ({
  pubkey,
  isSigner,
  isWritable,
});

interface InitVenuesBuild {
  ix: TransactionInstruction;
  vaultA: Keypair;
  vaultB: Keypair;
}

/**
 * Build `init_venues` (18 accounts, exact deployed struct order). Generates the
 * two fresh token-vault keypairs the Orca CPI requires as signers.
 *   data = disc(8) + tick_spacing(u16 LE) + initial_sqrt_price(u128 LE)
 */
function buildInitVenuesIx(args: {
  authority: PublicKey;
  global: PublicKey;
  memeMint: PublicKey;
  bondingCurve: PublicKey;
  baseMint: PublicKey;
  vSol?: BN | null;
  vTokens?: BN | null;
}): InitVenuesBuild {
  const { authority, global, memeMint, bondingCurve, baseMint } = args;
  const [mintA, mintB] = sortMints(baseMint, memeMint);
  const whirlpool = deriveWhirlpool(mintA, mintB);
  const tokenBadgeA = deriveTokenBadge(mintA);
  const tokenBadgeB = deriveTokenBadge(mintB);
  const vaultA = Keypair.generate();
  const vaultB = Keypair.generate();
  const sqrtPriceX64 = computeInitialSqrtPriceX64(
    baseMint,
    mintA,
    args.vSol,
    args.vTokens
  );

  const keys = [
    m(global, false), // [0] global
    m(authority, true, true), // [1] authority (funder, signer)
    m(memeMint, false), // [2] mint (meme)
    m(bondingCurve, false), // [3] bonding_curve
    m(WHIRLPOOLS_CONFIG, false), // [4] whirlpools_config
    m(mintA, false), // [5] token_mint_a
    m(mintB, false), // [6] token_mint_b
    m(tokenBadgeA, false), // [7] token_badge_a
    m(tokenBadgeB, false), // [8] token_badge_b
    m(whirlpool, true), // [9] whirlpool (W)
    m(vaultA.publicKey, true, true), // [10] token_vault_a (signer, W)
    m(vaultB.publicKey, true, true), // [11] token_vault_b (signer, W)
    m(FEE_TIER_TS64, false), // [12] fee_tier
    m(tokenProgramForMint(mintA), false), // [13] token_program_a
    m(tokenProgramForMint(mintB), false), // [14] token_program_b
    m(SystemProgram.programId, false), // [15] system_program
    m(SYSVAR_RENT_PUBKEY, false), // [16] rent
    m(ORCA_PROGRAM, false), // [17] orca_program
  ];

  const data = Buffer.concat([
    DISC_INIT_VENUES,
    u16le(TICK_SPACING),
    u128le(sqrtPriceX64),
  ]);

  return {
    ix: new TransactionInstruction({ programId: PUMP_PROGRAM, keys, data }),
    vaultA,
    vaultB,
  };
}

interface OpenLpBuild {
  ix: TransactionInstruction;
  positionMint: Keypair;
}

/**
 * Build `open_lp_position` (3 struct + 10 remaining = 13 accounts). The program
 * CPIs Orca open_position (owner = lp_owner PDA, locked forever) and initializes
 * both tick arrays. Generates the fresh position-mint keypair (a signer).
 *   data = disc(8) + tick_lower(i32) + tick_upper(i32) + start_lower(i32) + start_upper(i32)
 */
function buildOpenLpPositionIx(args: {
  funder: PublicKey;
  baseMint: PublicKey;
  memeMint: PublicKey;
  vSol?: BN | null;
  vTokens?: BN | null;
}): OpenLpBuild {
  const { funder, baseMint, memeMint } = args;
  const [mintA, mintB] = sortMints(baseMint, memeMint);
  const whirlpool = deriveWhirlpool(mintA, mintB);

  // The pool will be created with this sqrt price by init_venues, so derive the
  // (matching) current tick from it rather than reading the not-yet-existent pool.
  const sqrtPriceX64 = computeInitialSqrtPriceX64(
    baseMint,
    mintA,
    args.vSol,
    args.vTokens
  );
  const tickCurrent = sqrtX64ToTick(sqrtPriceX64);
  const baseIsA = mintA.equals(baseMint);
  const { tickLowerIndex, tickUpperIndex } = singleSidedRange(
    baseIsA,
    tickCurrent
  );
  const startLower = tickArrayStart(tickLowerIndex);
  const startUpper = tickArrayStart(tickUpperIndex);
  const tickArrayLower = deriveTickArray(whirlpool, startLower);
  const tickArrayUpper = deriveTickArray(whirlpool, startUpper);

  const lpOwner = findPda([Buffer.from("lp_owner")], PUMP_PROGRAM);
  const positionMint = Keypair.generate();
  const position = findPda(
    [Buffer.from("position"), positionMint.publicKey.toBuffer()],
    ORCA_PROGRAM
  );
  // Orca creates the position NFT as a CLASSIC SPL token regardless of pool side.
  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMint.publicKey,
    lpOwner,
    true,
    TOKEN_PROGRAM_ID
  );

  const keys = [
    // struct: funder, lp_owner, system_program
    m(funder, true, true),
    m(lpOwner, false),
    m(SystemProgram.programId, false),
    // remaining (open_position + tick arrays), exact deployed order
    m(whirlpool, false), // [r0] whirlpool
    m(position, true), // [r1] position (W)
    m(positionMint.publicKey, true, true), // [r2] position_mint (signer, W)
    m(positionTokenAccount, true), // [r3] position_token_account (W)
    m(TOKEN_PROGRAM_ID, false), // [r4] token_program
    m(ASSOCIATED_TOKEN_PROGRAM_ID, false), // [r5] associated_token_program
    m(SYSVAR_RENT_PUBKEY, false), // [r6] rent
    m(tickArrayLower, true), // [r7] tick_array_lower (W)
    m(tickArrayUpper, true), // [r8] tick_array_upper (W)
    m(ORCA_PROGRAM, false), // [r9] orca_program
  ];

  const data = Buffer.concat([
    DISC_OPEN_LP_POSITION,
    i32le(tickLowerIndex),
    i32le(tickUpperIndex),
    i32le(startLower),
    i32le(startUpper),
  ]);

  return {
    ix: new TransactionInstruction({ programId: PUMP_PROGRAM, keys, data }),
    positionMint,
  };
}

// --- tx assembly + send ---

function buildV0(
  payer: PublicKey,
  blockhash: string,
  ixs: TransactionInstruction[],
  ephemeralSigners: Keypair[]
): VersionedTransaction {
  const msg = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message();
  const tx = new VersionedTransaction(msg);
  if (ephemeralSigners.length) tx.sign(ephemeralSigners); // partial sign
  return tx;
}

async function sendAndConfirm(
  connection: Connection,
  tx: VersionedTransaction,
  label: string
): Promise<string> {
  const raw = tx.serialize();
  const sig = await connection.sendRawTransaction(raw, {
    skipPreflight: true,
    maxRetries: 3,
  });

  const MAX_MS = 60_000;
  const POLL_MS = 1_500;
  const RESEND_MS = 5_000;
  const start = Date.now();
  let lastResend = Date.now();

  while (Date.now() - start < MAX_MS) {
    await sleep(POLL_MS);
    try {
      const st = await connection.getSignatureStatuses([sig]);
      const s = st?.value?.[0];
      if (s) {
        if (s.err) {
          throw new Error(`${label} reverted: ${JSON.stringify(s.err)}`);
        }
        if (
          s.confirmationStatus === "confirmed" ||
          s.confirmationStatus === "finalized"
        ) {
          return sig;
        }
      }
    } catch (e) {
      // Re-throw a real on-chain revert; swallow transient RPC errors.
      if (e instanceof Error && e.message.indexOf("reverted") !== -1) throw e;
    }
    if (Date.now() - lastResend > RESEND_MS) {
      lastResend = Date.now();
      connection.sendRawTransaction(raw, { skipPreflight: true }).catch(() => {});
    }
  }
  throw new Error(`${label} not confirmed within window`);
}

export interface VenueSetupResult {
  attempted: string[];
  succeeded: string[];
  skipped: string[];
  failed: string[];
}

export type VenueStatusKind = "info" | "success" | "error";

export interface OpenVenuesParams {
  connection: Connection;
  payer: PublicKey;
  mint: PublicKey;
  /** Bonding-curve virtual reserves (for the wSOL pool's real initial price). */
  virtualSolReserves?: BN | null;
  virtualTokenReserves?: BN | null;
  /** Prefer one approval for all txs; falls back to signTransaction per tx. */
  signAllTransactions?: (
    txs: VersionedTransaction[]
  ) => Promise<VersionedTransaction[]>;
  signTransaction?: (
    tx: VersionedTransaction
  ) => Promise<VersionedTransaction>;
  priorityFeeMicroLamports?: number;
  onStatus?: (msg: string, kind?: VenueStatusKind) => void;
}

/**
 * Open the 3 Orca venues + program-owned LP positions for a freshly created
 * coin. Resilient: never throws — returns a per-base summary. Skips bases whose
 * whirlpool already exists. The caller must have already confirmed `create`.
 */
export async function openVenuesForNewCoin(
  params: OpenVenuesParams
): Promise<VenueSetupResult> {
  const {
    connection,
    payer,
    mint,
    virtualSolReserves,
    virtualTokenReserves,
    signAllTransactions,
    signTransaction,
    priorityFeeMicroLamports = 100_000,
    onStatus,
  } = params;

  const result: VenueSetupResult = {
    attempted: [],
    succeeded: [],
    skipped: [],
    failed: [],
  };
  const status = (msg: string, kind?: VenueStatusKind) =>
    onStatus && onStatus(msg, kind);

  const vSol = virtualSolReserves
    ? new BN(virtualSolReserves.toString())
    : null;
  const vTokens = virtualTokenReserves
    ? new BN(virtualTokenReserves.toString())
    : null;

  const global = findPda([Buffer.from("global")], PUMP_PROGRAM);
  const bondingCurve = findPda(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PUMP_PROGRAM
  );

  // Guard: init_venues references the bonding_curve + mint as EXISTING accounts.
  // Wait briefly for `create` to be visible before doing anything.
  let curveReady = false;
  for (let i = 0; i < 12; i++) {
    try {
      const info = await connection.getAccountInfo(bondingCurve);
      if (info) {
        curveReady = true;
        break;
      }
    } catch {
      /* transient */
    }
    await sleep(2_000);
  }
  if (!curveReady) {
    status("could not confirm new coin on-chain; skipping venue setup", "error");
    return result;
  }

  // Decide which bases need work (skip pools that already exist), and build the
  // per-base init + open transactions.
  interface BaseTxs {
    label: string;
    initTx: VersionedTransaction;
    openTx: VersionedTransaction;
  }
  const perBase: BaseTxs[] = [];

  const cuPrice = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFeeMicroLamports,
  });

  // One shared blockhash for all txs so a single approval stays valid; each
  // base's open is fired right after its init confirms (well within validity).
  const { blockhash } = await connection.getLatestBlockhash("finalized");

  for (const base of BASES) {
    try {
      const [mintA, mintB] = sortMints(base.mint, mint);
      const whirlpool = deriveWhirlpool(mintA, mintB);
      let exists = false;
      try {
        exists = (await connection.getAccountInfo(whirlpool)) !== null;
      } catch {
        /* treat as not-exists; init CPI errors if it really exists */
      }
      if (exists) {
        result.skipped.push(base.label);
        status(`${base.label} pool already exists — skipping`, "info");
        continue;
      }

      const init = buildInitVenuesIx({
        authority: payer,
        global,
        memeMint: mint,
        bondingCurve,
        baseMint: base.mint,
        vSol,
        vTokens,
      });
      const open = buildOpenLpPositionIx({
        funder: payer,
        baseMint: base.mint,
        memeMint: mint,
        vSol,
        vTokens,
      });

      const initTx = buildV0(
        payer,
        blockhash,
        [
          cuPrice,
          ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
          init.ix,
        ],
        [init.vaultA, init.vaultB]
      );
      const openTx = buildV0(
        payer,
        blockhash,
        [
          cuPrice,
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
          open.ix,
        ],
        [open.positionMint]
      );

      perBase.push({ label: base.label, initTx, openTx });
      result.attempted.push(base.label);
    } catch (e) {
      result.failed.push(base.label);
      status(`${base.label} venue could not be prepared`, "error");
      // eslint-disable-next-line no-console
      console.warn("venue prep failed", base.label, e);
    }
  }

  if (perBase.length === 0) return result;

  // Single wallet approval for every tx (ephemeral keypairs already partial-signed).
  const allTxs: VersionedTransaction[] = [];
  perBase.forEach((b) => {
    allTxs.push(b.initTx, b.openTx);
  });

  let signed: VersionedTransaction[];
  try {
    if (signAllTransactions) {
      signed = await signAllTransactions(allTxs);
    } else if (signTransaction) {
      signed = [];
      for (const t of allTxs) signed.push(await signTransaction(t));
    } else {
      status("wallet cannot sign venue transactions; skipping", "error");
      return result;
    }
  } catch (e) {
    status("venue setup not approved; coin still created", "info");
    // eslint-disable-next-line no-console
    console.warn("venue signing declined/failed", e);
    return result;
  }

  // Map the signed txs back to their bases (order preserved).
  const signedBase = perBase.map((b, i) => ({
    label: b.label,
    initTx: signed[i * 2],
    openTx: signed[i * 2 + 1],
  }));

  status("opening venues…", "info");

  await Promise.all(
    signedBase.map(async (b) => {
      try {
        await sendAndConfirm(connection, b.initTx, `${b.label} init_venues`);
        await sendAndConfirm(connection, b.openTx, `${b.label} open_lp_position`);
        result.succeeded.push(b.label);
        status(`${b.label} venue + LP position opened`, "success");
      } catch (e) {
        result.failed.push(b.label);
        status(`${b.label} venue setup failed (coin is unaffected)`, "error");
        // eslint-disable-next-line no-console
        console.warn("venue setup failed", b.label, e);
      }
    })
  );

  // TODO(registry): the freshly opened positions are NOT yet in
  // constants/lpPositions.json (a build-time import we must not write from the
  // browser). The per-trade `add_liq` leg only picks them up after the backend
  // registry / indexer is refreshed — e.g. re-running
  // scripts/open-lp-positions.js to re-derive each entry (which also creates the
  // lp_owner token ATAs that add_liq's remaining accounts require). Until then
  // trading still works; only the single-sided LP top-up is deferred.

  return result;
}
