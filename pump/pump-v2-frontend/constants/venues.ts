import { Connection, PublicKey } from "@solana/web3.js";

/**
 * On-chain venue / referral constants and helpers for the per-trade bundle
 * (3-deep referral + Orca LP + buy&burn HOUSE).
 *
 * SSR-safe: all window/localStorage access is guarded.
 */

// HOUSE token (Token-2022 mint) used by the buy&burn leg.
export const HOUSE_MINT = new PublicKey(
  "Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump"
);

// Orca Whirlpools program.
export const ORCA_PROGRAM_ID = new PublicKey(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
);

// Orca WhirlpoolsConfig that the pools for this launchpad live under.
export const WHIRLPOOLS_CONFIG = new PublicKey(
  "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ"
);

// Base mints for the three Orca pools we derive per coin.
export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

// Top-level / fallback referrer used when no `?ref=` is captured or stored.
// Driven by NEXT_PUBLIC_DEFAULT_REFERRER so each mirror/fork earns its own
// top-of-tree referral fees (prompted at 1-click deploy). Falls back to the
// canonical wallet if unset/invalid so module load can never crash.
const FALLBACK_DEFAULT_REFERRER = "WzMaL78srutrF6CsxEkWuhMaDF5HZA6jNRaEPengqpb";
function resolveDefaultReferrer(): PublicKey {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_REFERRER?.trim();
  if (fromEnv) {
    try {
      return new PublicKey(fromEnv);
    } catch {
      /* invalid env value — use canonical fallback below */
    }
  }
  return new PublicKey(FALLBACK_DEFAULT_REFERRER);
}
export const DEFAULT_REFERRER = resolveDefaultReferrer();

export const REFERRER_STORAGE_KEY = "pumpReferrer";
export const REFERRAL_CHAIN_STORAGE_KEY = "pumpReferralChain";

const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const safePublicKey = (value?: string | null): PublicKey | null => {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
};

const readQueryRef = (): PublicKey | null => {
  if (!isBrowser()) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return safePublicKey(params.get("ref"));
  } catch {
    return null;
  }
};

/**
 * Read a `?ref=<pubkey>` query param (if present and valid) and persist it to
 * localStorage. Safe to call on every page load; no-op on the server.
 * Returns the captured referrer (or null).
 */
export const captureReferral = (): PublicKey | null => {
  if (!isBrowser()) return null;
  const fromQuery = readQueryRef();
  if (fromQuery) {
    try {
      window.localStorage.setItem(REFERRER_STORAGE_KEY, fromQuery.toBase58());
    } catch {
      /* ignore persistence failures */
    }
  }
  return fromQuery;
};

/**
 * Resolve the direct referrer in priority order:
 *   1. `?ref=<pubkey>` query param (also persisted to localStorage)
 *   2. localStorage "pumpReferrer"
 *   3. program DEFAULT_REFERRER constant
 */
export const resolveReferrer = (): PublicKey => {
  if (isBrowser()) {
    const fromQuery = captureReferral();
    if (fromQuery) return fromQuery;

    try {
      const fromStorage = safePublicKey(
        window.localStorage.getItem(REFERRER_STORAGE_KEY)
      );
      if (fromStorage) return fromStorage;
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_REFERRER;
};

export interface ReferralChain {
  referrer: PublicKey;
  referrer2: PublicKey;
  referrer3: PublicKey;
}

/**
 * Build the 3-deep referral chain for `userPubkey`.
 *
 * - referrer:  resolved via resolveReferrer() (query/localStorage/default)
 * - referrer2/referrer3: read from a stored chain ("pumpReferralChain" JSON)
 *   if available, otherwise fall back to the user's own pubkey (no-op tier;
 *   the program treats self as "no referral").
 */
export const getReferralChain = (userPubkey: PublicKey): ReferralChain => {
  const fallback = userPubkey;

  let referrer = fallback;
  const direct = resolveReferrer();
  if (direct) referrer = direct;

  let referrer2 = fallback;
  let referrer3 = fallback;

  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(REFERRAL_CHAIN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          referrer?: string;
          referrer2?: string;
          referrer3?: string;
        };
        referrer = safePublicKey(parsed.referrer) ?? referrer;
        referrer2 = safePublicKey(parsed.referrer2) ?? fallback;
        referrer3 = safePublicKey(parsed.referrer3) ?? fallback;
      }
    } catch {
      /* ignore malformed chain */
    }
  }

  return { referrer, referrer2, referrer3 };
};

const sortMints = (a: PublicKey, b: PublicKey): [PublicKey, PublicKey] =>
  Buffer.compare(a.toBuffer(), b.toBuffer()) <= 0 ? [a, b] : [b, a];

/**
 * Derive the Orca whirlpool PDA for a (base, meme) mint pair.
 *
 * Seeds: ["whirlpool", whirlpoolsConfig, tokenMintA, tokenMintB, tickSpacing u16 LE]
 * under the Orca Whirlpools program, where (tokenMintA, tokenMintB) are the two
 * mints sorted by byte order.
 *
 * NOTE: the derived PDA may not exist yet for a given coin — that's fine, the
 * program gates the LP/swap CPIs on the pool being live and otherwise no-ops.
 */
export const deriveWhirlpool = (
  baseMint: PublicKey,
  memeMint: PublicKey,
  tickSpacing = 64
): PublicKey => {
  const [tokenMintA, tokenMintB] = sortMints(baseMint, memeMint);

  const tickSpacingBuffer = Buffer.alloc(2);
  tickSpacingBuffer.writeUInt16LE(tickSpacing, 0);

  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("whirlpool"),
      WHIRLPOOLS_CONFIG.toBuffer(),
      tokenMintA.toBuffer(),
      tokenMintB.toBuffer(),
      tickSpacingBuffer,
    ],
    ORCA_PROGRAM_ID
  );

  return pda;
};

export interface OrcaPools {
  orcaSolNewmeme: PublicKey;
  orcaUsdcNewmeme: PublicKey;
  orcaHouseNewmeme: PublicKey;
}

/**
 * Derive the SOL/USDC/HOUSE Orca whirlpool PDAs for a given meme mint.
 */
export const deriveOrcaPools = (
  memeMint: PublicKey,
  tickSpacing = 64
): OrcaPools => ({
  orcaSolNewmeme: deriveWhirlpool(WSOL_MINT, memeMint, tickSpacing),
  orcaUsdcNewmeme: deriveWhirlpool(USDC_MINT, memeMint, tickSpacing),
  orcaHouseNewmeme: deriveWhirlpool(HOUSE_MINT, memeMint, tickSpacing),
});

/**
 * Derive the referral record PDA for a user.
 * Seeds: ["referral", user].
 */
export const deriveReferralRecord = (
  user: PublicKey,
  programId: PublicKey
): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("referral"), user.toBuffer()],
    programId
  );
  return pda;
};

/**
 * Resolve the TRUE 3-deep referral chain for `userPubkey` by reading the direct
 * referrer's on-chain `referral_record`. This is what actually makes tiers 2/3
 * pay out: when A is referred by B, A's tier-2 = B's tier-1 and A's tier-3 =
 * B's tier-2 (read from B's record). Falls back to `getReferralChain` semantics
 * (tier2/3 = user => skipped on-chain) if B has no record yet.
 *
 * Referral account layout: disc(8) + user(32) + referrer(32) + referrer2(32) +
 * referrer3(32) => referrer @ offset 40, referrer2 @ offset 72.
 */
export const getReferralChainOnchain = async (
  connection: Connection,
  userPubkey: PublicKey,
  programId: PublicKey
): Promise<ReferralChain> => {
  const referrer = resolveReferrer();
  let referrer2 = userPubkey;
  let referrer3 = userPubkey;

  // Only meaningful if there's a real, distinct direct referrer.
  if (!referrer.equals(userPubkey)) {
    try {
      const recPda = deriveReferralRecord(referrer, programId);
      const info = await connection.getAccountInfo(recPda);
      if (info && info.data.length >= 104) {
        const d = info.data;
        const bRef1 = new PublicKey(d.subarray(40, 72)); // B's tier-1
        const bRef2 = new PublicKey(d.subarray(72, 104)); // B's tier-2
        if (!bRef1.equals(PublicKey.default)) referrer2 = bRef1;
        if (!bRef2.equals(PublicKey.default)) referrer3 = bRef2;
      }
    } catch {
      /* RPC error — leave tiers 2/3 as no-op (user) */
    }
  }

  return { referrer, referrer2, referrer3 };
};
