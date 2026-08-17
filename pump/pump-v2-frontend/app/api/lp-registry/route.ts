import {
  Connection,
  PublicKey,
} from "@solana/web3.js";

/**
 * LIVE LP registry, derived from chain (no static JSON).
 *
 * Every Orca position for the "LP forever" leg is owned by the program's
 * `lp_owner` PDA. We enumerate that PDA's position NFTs, read each Orca position
 * (whirlpool + tick range), read the whirlpools (mints/vaults/tickSpacing), and
 * reconstruct the per-coin/per-venue deposit descriptors the frontend's add_liq
 * leg needs — the same shape the old constants/lpPositions.json had:
 *   { "<memeMint>": { sol?:{…}, usdc?:{…}, house?:{…} } }
 *
 * Because it's derived live, newly-opened positions show up automatically with
 * no script-writes-JSON / commit / redeploy cycle. Cached server-side.
 */

export const revalidate = 60;
export const maxDuration = 30;

const PUMP = new PublicKey(process.env.NEXT_PUBLIC_PUMP_PROGRAM_ID as string);
const ORCA = new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN22 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ATA_PROG = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const WSOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const HOUSE = "Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump";
const VENUE_OF: Record<string, "sol" | "usdc" | "house"> = {
  [WSOL]: "sol",
  [USDC]: "usdc",
  [HOUSE]: "house",
};

const pda = (seeds: (Buffer | Uint8Array)[], prog: PublicKey) =>
  PublicKey.findProgramAddressSync(seeds, prog)[0];
const tokenProgramFor = (mint: string) =>
  mint === WSOL || mint === USDC ? TOKEN : TOKEN22;
const ataOf = (mint: string, owner: PublicKey, tokenProg: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProg.toBuffer(), new PublicKey(mint).toBuffer()],
    ATA_PROG
  )[0];
const tickArrayStart = (tick: number, spacing: number) => {
  const span = spacing * 88;
  return Math.floor(tick / span) * span;
};
const deriveTickArray = (whirlpool: PublicKey, start: number) =>
  pda([Buffer.from("tick_array"), whirlpool.toBuffer(), Buffer.from(String(start))], ORCA);

export async function GET() {
  const rpc = process.env.NEXT_PUBLIC_SOLANA_API_URL;
  if (!rpc) return Response.json({ error: "RPC not configured" }, { status: 500 });

  try {
    const conn = new Connection(rpc, "confirmed");
    const lpOwner = pda([Buffer.from("lp_owner")], PUMP);

    // 1) lp_owner's position NFTs (classic-token, amount 1, decimals 0).
    //
    // AUTHORITY CHECK: only positions whose NFT sits in lp_owner's CANONICAL
    // associated token account are depositable by add_liq — that's the account
    // it passes to Orca's increase_liquidity as `position_token_account`, and
    // Orca requires position_authority(lp_owner) == position_token_account.owner
    // and that it holds the NFT. "Non-standard" positions (NFT minted into a
    // non-ATA account, or opened by a different flow) make the CPI revert
    // (Custom 3010 / AccountNotSigner), which breaks the whole buy bundle. We
    // exclude them here so add_liq only ever fires on positions it can sign for.
    const parsed = await conn.getParsedTokenAccountsByOwner(lpOwner, { programId: TOKEN });
    const positionMints: PublicKey[] = [];
    let skippedNonStandard = 0;
    for (const { pubkey, account } of parsed.value) {
      const info: any = account.data?.parsed?.info;
      const amt = info?.tokenAmount;
      if (amt && amt.decimals === 0 && amt.amount === "1") {
        try {
          const mint = new PublicKey(info.mint);
          const canonicalAta = ataOf(info.mint, lpOwner, TOKEN);
          if (pubkey.equals(canonicalAta)) {
            positionMints.push(mint);
          } else {
            skippedNonStandard++;
          }
        } catch {
          /* skip */
        }
      }
    }
    if (positionMints.length === 0) {
      return Response.json({
        generatedAt: new Date().toISOString(),
        count: 0,
        skippedNonStandard,
        registry: {},
      });
    }

    // 2) Orca position PDAs for each NFT mint → read (whirlpool + tick range).
    const positionPdas = positionMints.map((m) => pda([Buffer.from("position"), m.toBuffer()], ORCA));
    const positionAccts = await getMulti(conn, positionPdas);

    type Pos = {
      positionMint: PublicKey;
      position: PublicKey;
      whirlpool: PublicKey;
      tickLowerIndex: number;
      tickUpperIndex: number;
    };
    const positions: Pos[] = [];
    const whirlpoolSet = new Map<string, PublicKey>();
    positionAccts.forEach((acc, i) => {
      if (!acc || !acc.owner.equals(ORCA)) return;
      const d = acc.data;
      const whirlpool = new PublicKey(d.subarray(8, 40));
      const tickLowerIndex = d.readInt32LE(88);
      const tickUpperIndex = d.readInt32LE(92);
      positions.push({
        positionMint: positionMints[i],
        position: positionPdas[i],
        whirlpool,
        tickLowerIndex,
        tickUpperIndex,
      });
      whirlpoolSet.set(whirlpool.toBase58(), whirlpool);
    });

    // 3) Read the whirlpools (mints / vaults / tickSpacing).
    const whirlpools = Array.from(whirlpoolSet.values());
    const whirlpoolAccts = await getMulti(conn, whirlpools);
    const poolInfo = new Map<
      string,
      {
        mintA: string; mintB: string; vaultA: string; vaultB: string;
        tickSpacing: number; tickCurrent: number;
      }
    >();
    whirlpoolAccts.forEach((acc, i) => {
      if (!acc) return;
      const d = acc.data;
      poolInfo.set(whirlpools[i].toBase58(), {
        tickSpacing: d.readUInt16LE(41),
        tickCurrent: d.readInt32LE(81),
        mintA: new PublicKey(d.subarray(101, 133)).toBase58(),
        vaultA: new PublicKey(d.subarray(133, 165)).toBase58(),
        mintB: new PublicKey(d.subarray(181, 213)).toBase58(),
        vaultB: new PublicKey(d.subarray(213, 245)).toBase58(),
      });
    });

    const QUOTE_MINT: Record<string, string> = { sol: WSOL, usdc: USDC, house: HOUSE };

    // 4) Reconstruct per-coin/per-venue deposit descriptors.
    const registry: Record<string, Record<string, unknown>> = {};
    for (const p of positions) {
      const pool = poolInfo.get(p.whirlpool.toBase58());
      if (!pool) continue;
      // The venue = whichever side is a known quote (WSOL/USDC/HOUSE); the coin
      // = the other (meme) mint.
      const aVenue = VENUE_OF[pool.mintA];
      const bVenue = VENUE_OF[pool.mintB];
      let venue: "sol" | "usdc" | "house" | undefined;
      let memeMint: string | undefined;
      if (aVenue && !bVenue) {
        venue = aVenue;
        memeMint = pool.mintB;
      } else if (bVenue && !aVenue) {
        venue = bVenue;
        memeMint = pool.mintA;
      } else {
        continue; // both/neither are quotes — not one of our venues
      }

      // Single-sided depositability at the CURRENT tick (same rule add_liq's
      // guard uses): the deposit only mints liquidity when price is on the quote
      // side of the position's range. With duplicate positions per (coin,venue),
      // prefer a currently-VALID one so add_liq never picks a dead duplicate.
      const quoteMint = QUOTE_MINT[venue];
      const quoteIsA = pool.mintA === quoteMint;
      const valid = quoteIsA
        ? pool.tickCurrent < p.tickLowerIndex
        : pool.tickCurrent >= p.tickUpperIndex;

      const entry = {
        whirlpool: p.whirlpool.toBase58(),
        position: p.position.toBase58(),
        positionMint: p.positionMint.toBase58(),
        positionTokenAccount: ataOf(p.positionMint.toBase58(), lpOwner, TOKEN).toBase58(),
        tickArrayLower: deriveTickArray(p.whirlpool, tickArrayStart(p.tickLowerIndex, pool.tickSpacing)).toBase58(),
        tickArrayUpper: deriveTickArray(p.whirlpool, tickArrayStart(p.tickUpperIndex, pool.tickSpacing)).toBase58(),
        tickLowerIndex: p.tickLowerIndex,
        tickUpperIndex: p.tickUpperIndex,
        tokenMintA: pool.mintA,
        tokenMintB: pool.mintB,
        tokenVaultA: pool.vaultA,
        tokenVaultB: pool.vaultB,
        tokenProgramA: tokenProgramFor(pool.mintA).toBase58(),
        tokenProgramB: tokenProgramFor(pool.mintB).toBase58(),
        tokenOwnerAccountA: ataOf(pool.mintA, lpOwner, tokenProgramFor(pool.mintA)).toBase58(),
        tokenOwnerAccountB: ataOf(pool.mintB, lpOwner, tokenProgramFor(pool.mintB)).toBase58(),
        valid,
      };

      const bucket = (registry[memeMint] ??= {});
      const existing = bucket[venue] as { valid?: boolean } | undefined;
      // First one wins, UNLESS the existing pick is invalid and this one is valid.
      if (!existing || (existing.valid === false && valid)) {
        bucket[venue] = entry;
      }
    }

    return Response.json({
      generatedAt: new Date().toISOString(),
      lpOwner: lpOwner.toBase58(),
      count: Object.keys(registry).length,
      skippedNonStandard,
      registry,
    });
  } catch (e) {
    return Response.json({ error: `lp-registry: ${(e as Error).message}` }, { status: 502 });
  }
}

async function getMulti(conn: Connection, keys: PublicKey[]) {
  const out: ({ data: Buffer; owner: PublicKey } | null)[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const res = await conn.getMultipleAccountsInfo(chunk, "confirmed");
    for (const a of res) out.push(a ? { data: a.data as Buffer, owner: a.owner } : null);
  }
  return out;
}
