import lpPositions from "@/constants/lpPositions.json";

/**
 * Airdrop leaderboard data — "proof of spend".
 *
 * Server-side aggregation of every wallet's real money paid into stacc.art:
 *   - trad00rs: trading fees (bps * gross volume) + net SOL deposited (Supabase `trades`)
 *   - creators: who actually opened Orca venues (coins.creator ∩ lpPositions registry)
 * Plus the live $Pump ICO price (Dexscreener) so the client can denominate the
 * airdrop tranche in $Pump ICO. Returns RAW per-wallet metrics; the page applies
 * the (tunable, anti-gaming) scoring curve client-side.
 *
 * The Supabase service key is read from server env and never leaves this route.
 */

export const revalidate = 60; // re-pull trades + price at most once per 60s

const FEE_BPS = Number(process.env.AIRDROP_FEE_BPS ?? 100); // 1% fee assumption
const VENUE_RENT_SOL = Number(process.env.AIRDROP_VENUE_RENT_SOL ?? 0.115);
const LAMPORTS_PER_SOL = 1e9;
const PUMP_ICO_POOL = "9nStgVVCinCyKoBiMGMfCM2iG3TW411EDmUcQqHxL2ek";

type Coin = { mint: string; creator: string | null };
type Trade = {
  user: string | null;
  sol_amount: number | string;
  is_buy: boolean;
  timestamp: number | string;
  mint: string | null;
};

function isoWeek(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000);
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function round(n: number, dp = 6): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

async function fetchAll<T>(
  base: string,
  key: string,
  table: string,
  select: string
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  let offset = 0;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  for (;;) {
    const url = `${base}/rest/v1/${table}?select=${select}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers, next: { revalidate } });
    if (!res.ok) throw new Error(`${table} ${res.status}`);
    const batch = (await res.json()) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function fetchPumpIcoPrice() {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/solana/${PUMP_ICO_POOL}`,
      { next: { revalidate } }
    );
    if (!res.ok) return null;
    const j = await res.json();
    const p = (j.pairs && j.pairs[0]) || j.pair;
    if (!p) return null;
    return {
      mint: p.baseToken?.address ?? null,
      symbol: p.baseToken?.symbol ?? "Pump ICO",
      priceUsd: Number(p.priceUsd) || null,
      priceSol: Number(p.priceNative) || null,
      marketCapUsd: p.marketCap ?? p.fdv ?? null,
      liquidityUsd: p.liquidity?.usd ?? null,
      pool: PUMP_ICO_POOL,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Complete, safe, EMPTY response shape — so the page (which reads
// data.totals.grossVolumeSol, only `data` optional-chained) never crashes when
// neither a local Supabase key NOR the shared backend is available.
function emptyAirdrop(note: string) {
  return {
    generatedAt: new Date().toISOString(),
    pumpIco: null,
    note,
    assumptions: { FEE_BPS, VENUE_RENT_SOL, solUnit: "sol" },
    totals: { wallets: 0, coins: 0, trades: 0, coinsWithVenues: 0, grossVolumeSol: 0 },
    wallets: [] as unknown[],
  };
}

export async function GET() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!base || !key) {
    // MIRROR PATH (no Supabase secret): proxy to the shared backend, which holds
    // the key and computes the identical aggregation (StatsService.airdrop). This
    // is what lets the airdrop page work on every mirror without any secrets.
    const backend = process.env.NEXT_PUBLIC_CLIENT_API_URL;
    if (backend) {
      try {
        const res = await fetch(`${backend}/stats/airdrop`, { next: { revalidate } });
        if (res.ok) {
          const j = await res.json();
          if (j && Array.isArray(j.wallets) && j.totals) return Response.json(j);
        }
      } catch {
        /* fall through to empty */
      }
    }
    return Response.json(emptyAirdrop("airdrop backend unavailable"));
  }

  const venueMints = new Set(Object.keys(lpPositions as Record<string, unknown>));

  let coins: Coin[] = [];
  let trades: Trade[] = [];
  let users2: { address: string; username?: string; profile_image?: string }[] = [];
  try {
    [coins, trades] = await Promise.all([
      fetchAll<Coin>(base, key, "coins", "mint,creator"),
      fetchAll<Trade>(base, key, "trades", "user,sol_amount,is_buy,timestamp,mint"),
    ]);
    try {
      users2 = await fetchAll(base, key, "users2", "address,username,profile_image");
    } catch {
      users2 = [];
    }
  } catch (e) {
    return Response.json(
      { error: `Supabase fetch failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  const profile = new Map(users2.map((u) => [u.address, u]));

  const sample = trades.find((t) => Number(t.sol_amount) > 0);
  const looksLamports = !!sample && Number(sample.sol_amount) > 1e6;
  const toSol = (v: number | string) =>
    Number(v) / (looksLamports ? LAMPORTS_PER_SOL : 1);

  const creatorCoins = new Map<string, { coinsCreated: number; venueMints: string[] }>();
  for (const c of coins) {
    if (!c.creator) continue;
    const rec = creatorCoins.get(c.creator) ?? { coinsCreated: 0, venueMints: [] };
    rec.coinsCreated += 1;
    if (venueMints.has(c.mint)) rec.venueMints.push(c.mint);
    creatorCoins.set(c.creator, rec);
  }

  type Agg = {
    wallet: string;
    buySol: number;
    sellSol: number;
    trades: number;
    buys: number;
    sells: number;
    mints: Set<string>;
    weeks: Set<string>;
    firstTs: number;
    lastTs: number;
  };
  const wallets = new Map<string, Agg>();
  const get = (w: string): Agg => {
    let a = wallets.get(w);
    if (!a) {
      a = {
        wallet: w,
        buySol: 0,
        sellSol: 0,
        trades: 0,
        buys: 0,
        sells: 0,
        mints: new Set(),
        weeks: new Set(),
        firstTs: Infinity,
        lastTs: 0,
      };
      wallets.set(w, a);
    }
    return a;
  };

  for (const t of trades) {
    if (!t.user) continue;
    const w = get(t.user);
    const sol = toSol(t.sol_amount);
    if (t.is_buy) {
      w.buySol += sol;
      w.buys += 1;
    } else {
      w.sellSol += sol;
      w.sells += 1;
    }
    w.trades += 1;
    if (t.mint) w.mints.add(t.mint);
    const ts = Number(t.timestamp);
    if (ts) {
      w.weeks.add(isoWeek(ts));
      w.firstTs = Math.min(w.firstTs, ts);
      w.lastTs = Math.max(w.lastTs, ts);
    }
  }
  creatorCoins.forEach((_rec, creator) => get(creator));

  const out = Array.from(wallets.values()).map((w) => {
    const grossSol = w.buySol + w.sellSol;
    const netSol = w.buySol - w.sellSol;
    const feesPaidSol = (grossSol * FEE_BPS) / 10000;
    const cc = creatorCoins.get(w.wallet);
    const coinsWithVenues = cc ? cc.venueMints.length : 0;
    const venueRentSol = coinsWithVenues * VENUE_RENT_SOL;
    const p = profile.get(w.wallet);
    return {
      wallet: w.wallet,
      username: p?.username ?? null,
      buySol: round(w.buySol),
      sellSol: round(w.sellSol),
      grossSol: round(grossSol),
      netSol: round(netSol),
      feesPaidSol: round(feesPaidSol),
      trades: w.trades,
      buys: w.buys,
      sells: w.sells,
      distinctMints: w.mints.size,
      activeWeeks: w.weeks.size,
      washResistance: grossSol > 0 ? round(Math.abs(netSol) / grossSol, 4) : 0,
      coinsCreated: cc?.coinsCreated ?? 0,
      coinsWithVenues,
      venueRentSol: round(venueRentSol),
    };
  });
  out.sort((a, b) => b.feesPaidSol + b.venueRentSol - (a.feesPaidSol + a.venueRentSol));

  const pumpIco = await fetchPumpIcoPrice();

  return Response.json({
    generatedAt: new Date().toISOString(),
    pumpIco,
    assumptions: { FEE_BPS, VENUE_RENT_SOL, solUnit: looksLamports ? "lamports" : "sol" },
    totals: {
      wallets: out.length,
      coins: coins.length,
      trades: trades.length,
      coinsWithVenues: venueMints.size,
      grossVolumeSol: round(out.reduce((s, x) => s + x.grossSol, 0)),
    },
    wallets: out,
  });
}
