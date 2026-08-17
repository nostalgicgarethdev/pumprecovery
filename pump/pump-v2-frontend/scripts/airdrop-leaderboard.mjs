#!/usr/bin/env node
/**
 * Airdrop leaderboard data pull — "proof of spend".
 *
 * Aggregates every wallet's REAL money paid into stacc.art across two roles:
 *   1. trad00rs  — fees paid (bps * gross volume) + net SOL deposited, from the
 *                  Supabase `trades` table. Wash trading nets ~0 SOL, so the
 *                  net-deposited column lets the dash discount it.
 *   2. creators  — who actually OPENED Orca venues (paid the LP/position rent),
 *                  from coins.creator joined against the committed lpPositions
 *                  registry (mints that have live Orca positions).
 *
 * Emits a raw per-wallet snapshot (constants/airdrop-snapshot.json). The canvas
 * dash does the scoring/weighting on top of these raw numbers.
 *
 * Usage:
 *   node scripts/airdrop-leaderboard.mjs
 *   FEE_BPS=100 VENUE_RENT_SOL=0.115 node scripts/airdrop-leaderboard.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = join(__dirname, "..");
const CLIENT_SERVER_ENV = join(
  FRONTEND_ROOT,
  "..",
  "pump-v2-client-server",
  ".env"
);
const LP_POSITIONS = join(FRONTEND_ROOT, "constants", "lpPositions.json");
const OUT = join(FRONTEND_ROOT, "constants", "airdrop-snapshot.json");

// $Pump ICO ($HOUSE) migrated PumpSwap pool — used to price the airdrop token.
const PUMP_ICO_POOL = "9nStgVVCinCyKoBiMGMfCM2iG3TW411EDmUcQqHxL2ek";

async function fetchPumpIcoPrice() {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/solana/${PUMP_ICO_POOL}`
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

// Tunables (ranking is invariant to FEE_BPS; it only scales absolute SOL).
const FEE_BPS = Number(process.env.FEE_BPS ?? 100); // 1% total fee assumption
// Rent a creator pays per coin that has venues opened. One SOL whirlpool
// position + tick arrays ~= 0.11-0.12 SOL; tune as venues expand to 3 pools.
const VENUE_RENT_SOL = Number(process.env.VENUE_RENT_SOL ?? 0.115);
const LAMPORTS_PER_SOL = 1e9;

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = parseEnv(CLIENT_SERVER_ENV);
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_KEY in client-server .env");
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function fetchAll(table, select, pageSize = 1000) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&order=timestamp.asc&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      // timestamp ordering may not exist on every table; retry without order
      const url2 = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=${pageSize}&offset=${offset}`;
      const res2 = await fetch(url2, { headers });
      if (!res2.ok)
        throw new Error(`${table} fetch failed: ${res.status} ${await res.text()}`);
      const batch2 = await res2.json();
      rows.push(...batch2);
      if (batch2.length < pageSize) break;
      offset += pageSize;
      continue;
    }
    const batch = await res.json();
    rows.push(...batch);
    process.stdout.write(`\r  ${table}: ${rows.length} rows`);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  process.stdout.write("\n");
  return rows;
}

function isoWeek(tsSeconds) {
  const d = new Date(tsSeconds * 1000);
  // ISO week key YYYY-Www
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function main() {
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log("Pulling coins + trades...");

  const lp = JSON.parse(readFileSync(LP_POSITIONS, "utf8"));
  const venueMints = new Set(Object.keys(lp));

  const coins = await fetchAll("coins", "mint,creator,symbol,name,created_timestamp");
  const trades = await fetchAll("trades", "user,sol_amount,is_buy,timestamp,mint");

  let users2 = [];
  try {
    users2 = await fetchAll("users2", "address,username,profile_image");
  } catch {
    console.log("  (users2 unavailable; skipping usernames)");
  }
  const profile = new Map(users2.map((u) => [u.address, u]));

  // Sanity: detect lamports vs SOL by magnitude of a non-zero sample.
  const sample = trades.find((t) => Number(t.sol_amount) > 0);
  const looksLamports = sample && Number(sample.sol_amount) > 1e6;
  const toSol = (v) => Number(v) / (looksLamports ? LAMPORTS_PER_SOL : 1);
  console.log(
    `  sol_amount sample=${sample?.sol_amount} => interpreting as ${
      looksLamports ? "lamports" : "SOL"
    }`
  );

  // creator -> coins, and which have venues
  const creatorCoins = new Map();
  for (const c of coins) {
    if (!c.creator) continue;
    const rec = creatorCoins.get(c.creator) ?? {
      coinsCreated: 0,
      venueMints: [],
    };
    rec.coinsCreated += 1;
    if (venueMints.has(c.mint)) rec.venueMints.push(c.mint);
    creatorCoins.set(c.creator, rec);
  }

  // per-wallet trading aggregation
  const wallets = new Map();
  const get = (w) =>
    wallets.get(w) ??
    wallets
      .set(w, {
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
      })
      .get(w);

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

  // merge in creators (a creator may have zero trades)
  for (const [creator] of creatorCoins) get(creator);

  const out = [];
  for (const w of wallets.values()) {
    const grossSol = w.buySol + w.sellSol;
    const netSol = w.buySol - w.sellSol;
    const feesPaidSol = (grossSol * FEE_BPS) / 10000;
    const cc = creatorCoins.get(w.wallet);
    const coinsWithVenues = cc ? cc.venueMints.length : 0;
    const venueRentSol = coinsWithVenues * VENUE_RENT_SOL;
    const p = profile.get(w.wallet);
    out.push({
      wallet: w.wallet,
      username: p?.username ?? null,
      profile_image: p?.profile_image ?? null,
      // trader (money paid)
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
      firstTs: w.firstTs === Infinity ? null : w.firstTs,
      lastTs: w.lastTs || null,
      // creator (money paid to open venues)
      coinsCreated: cc?.coinsCreated ?? 0,
      coinsWithVenues,
      venueRentSol: round(venueRentSol),
      // headline proof-of-spend = real SOL paid into the system
      moneyPaidSol: round(feesPaidSol + venueRentSol),
    });
  }

  out.sort((a, b) => b.moneyPaidSol - a.moneyPaidSol);

  const pumpIco = await fetchPumpIcoPrice();
  if (pumpIco)
    console.log(
      `  $Pump ICO: $${pumpIco.priceUsd} (${pumpIco.priceSol} SOL) mcap $${pumpIco.marketCapUsd}`
    );

  const snapshot = {
    generatedAt: new Date().toISOString(),
    pumpIco,
    assumptions: { FEE_BPS, VENUE_RENT_SOL, solUnit: looksLamports ? "lamports" : "sol" },
    totals: {
      wallets: out.length,
      coins: coins.length,
      trades: trades.length,
      coinsWithVenues: venueMints.size,
      grossVolumeSol: round(out.reduce((s, x) => s + x.grossSol, 0)),
      feesPaidSol: round(out.reduce((s, x) => s + x.feesPaidSol, 0)),
    },
    wallets: out,
  };

  writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(
    `wallets=${out.length} coins=${coins.length} trades=${trades.length} coinsWithVenues=${venueMints.size}`
  );
  console.log(
    `total gross=${snapshot.totals.grossVolumeSol} SOL  fees(@${FEE_BPS}bps)=${snapshot.totals.feesPaidSol} SOL\n`
  );
  console.log("TOP 20 by money paid (fees + venue rent):");
  console.log(
    "rank  moneyPaid  fees    venueRent  gross    net      wks  mints  coins/venues  wallet"
  );
  out.slice(0, 20).forEach((x, i) => {
    console.log(
      `${String(i + 1).padStart(2)}.  ` +
        `${pad(x.moneyPaidSol, 9)} ${pad(x.feesPaidSol, 7)} ${pad(x.venueRentSol, 9)} ` +
        `${pad(x.grossSol, 8)} ${pad(x.netSol, 8)} ${String(x.activeWeeks).padStart(3)} ` +
        `${String(x.distinctMints).padStart(5)}  ${String(x.coinsCreated)}/${x.coinsWithVenues}` +
        `           ${x.username ? x.username + " " : ""}${x.wallet}`
    );
  });
}

function round(n, dp = 6) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
function pad(n, w) {
  return String(n).padStart(w);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
