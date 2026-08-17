import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Platform-wide flywheel stats for the landing page:
 *   - global DEX TVL (Birdeye liquidity summed across all coins)
 *   - global 24h volume (bonding-curve trades, exact, from Supabase)
 *   - total referral income (est. = total fees / 3)
 *   - total $Pump ICO burned (exact: original supply − current supply, on-chain)
 *
 * All upstreams (Supabase service key, Birdeye key) stay server-side; cached 5m.
 */

export const revalidate = 300; // the cache: whole route recomputed at most once / 5min
export const maxDuration = 30;

const HOUSE_MINT = "Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump";
const HOUSE_ORIGINAL_SUPPLY = 1_000_000_000; // pump-standard 1B, fixed supply
const FEE_BPS = 100; // 1%
const LAMPORTS_PER_SOL = 1e9;
const BIRDEYE = "https://public-api.birdeye.so";
const MAX_COINS = 150; // bound Birdeye calls

async function supabaseAll(base: string, key: string, table: string, select: string) {
  const rows: any[] = [];
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let offset = 0;
  for (;;) {
    const r = await fetch(`${base}/rest/v1/${table}?select=${select}&limit=1000&offset=${offset}`, {
      headers,
      next: { revalidate },
    });
    if (!r.ok) throw new Error(`${table} ${r.status}`);
    const batch = await r.json();
    rows.push(...batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

async function mapLimit<T, R>(arr: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(arr.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, arr.length) }, async () => {
    while (i < arr.length) {
      const idx = i++;
      out[idx] = await fn(arr[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function birdeyeOverview(mint: string, key: string) {
  // Cached per-mint in Next's Data Cache (revalidate). The aggregate compute
  // runs at most once per window (route-level revalidate), and within that it
  // mostly reads these cached per-mint responses rather than hitting Birdeye.
  try {
    const r = await fetch(`${BIRDEYE}/defi/token_overview?address=${mint}`, {
      headers: { "X-API-KEY": key, "x-chain": "solana", accept: "application/json" },
      next: { revalidate },
    });
    if (!r.ok) return { liquidity: 0, price: 0 };
    const d = (await r.json())?.data ?? {};
    return { liquidity: Number(d.liquidity) || 0, price: Number(d.price) || 0 };
  } catch {
    return { liquidity: 0, price: 0 };
  }
}

export async function GET() {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  const beKey = process.env.BIRDEYE_API_KEY;
  const rpc = process.env.NEXT_PUBLIC_SOLANA_API_URL;
  if (!sbUrl || !sbKey || !beKey) {
    return Response.json({ error: "missing server env" }, { status: 500 });
  }

  // ---- Supabase: volume (bonding curve, exact) ----
  let totalVolumeSol = 0;
  let vol24Sol = 0;
  let coinMints: string[] = [];
  try {
    const [coins, trades] = await Promise.all([
      supabaseAll(sbUrl, sbKey, "coins", "mint,created_timestamp"),
      supabaseAll(sbUrl, sbKey, "trades", "sol_amount,timestamp"),
    ]);
    coinMints = coins
      .sort((a, b) => Number(b.created_timestamp || 0) - Number(a.created_timestamp || 0))
      .map((c) => c.mint)
      .filter(Boolean)
      .slice(0, MAX_COINS);
    const sample = trades.find((t) => Number(t.sol_amount) > 0);
    const looksLamports = !!sample && Number(sample.sol_amount) > 1e6;
    const toSol = (v: any) => Number(v) / (looksLamports ? LAMPORTS_PER_SOL : 1);
    const cutoff = Math.floor(Date.now() / 1000) - 86400;
    for (const t of trades) {
      const sol = toSol(t.sol_amount);
      totalVolumeSol += sol;
      if (Number(t.timestamp) >= cutoff) vol24Sol += sol;
    }
  } catch (e) {
    return Response.json({ error: `supabase: ${(e as Error).message}` }, { status: 502 });
  }

  // ---- SOL price ----
  let solPrice = 0;
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/sol-price`, { next: { revalidate } });
    if (r.ok) solPrice = Number((await r.json()).solPrice) || 0;
  } catch {
    /* leave 0 */
  }

  // ---- Birdeye: HOUSE price first (single, reliable), then aggregate DEX TVL ----
  const house = await birdeyeOverview(HOUSE_MINT, beKey);
  const housePrice = house.price;
  // Gentle concurrency for the cold-window compute; warm requests are served
  // from the route cache and never reach here.
  const overviews = await mapLimit(coinMints, 2, (m) => birdeyeOverview(m, beKey));
  const tvlUsd = overviews.reduce((s, o) => s + o.liquidity, 0);

  // ---- On-chain: total $Pump ICO burned (supply delta) ----
  let burnedTokens = 0;
  try {
    if (rpc) {
      const conn = new Connection(rpc, "confirmed");
      const sup = await conn.getTokenSupply(new PublicKey(HOUSE_MINT));
      const current = Number(sup.value.uiAmount) || 0;
      burnedTokens = Math.max(0, HOUSE_ORIGINAL_SUPPLY - current);
    }
  } catch {
    /* leave 0 */
  }

  const feesSol = totalVolumeSol * (FEE_BPS / 10000);
  const refIncomeSol = feesSol / 3;

  return Response.json({
    tvlUsd,
    volume24hUsd: vol24Sol * solPrice,
    totalVolumeUsd: totalVolumeSol * solPrice,
    totalVolumeSol,
    refIncomeUsd: refIncomeSol * solPrice,
    refIncomeSol,
    burnedTokens,
    burnedUsd: burnedTokens * housePrice,
    housePrice,
    solPrice,
    coins: coinMints.length,
    updatedAt: new Date().toISOString(),
  });
}
