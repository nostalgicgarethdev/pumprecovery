/** @type {import('next').NextConfig} */

// Public, shareable defaults so a fresh fork/mirror deploy points at the SAME
// shared backends with zero config. Any value set in the environment (local
// .env, Vercel project env, or the 1-click deploy prompts) overrides these.
// NOTE: only non-secret, browser-exposed values belong here. Secrets
// (SUPABASE_KEY, BIRDEYE_API_KEY, PINATA_*) are never baked — see .env.example.
const withDefault = (key, fallback) => {
  const v = process.env[key];
  return v && v.trim() ? v : fallback;
};

const SHARED_DEFAULTS = {
  NEXT_PUBLIC_API_URL: "https://pump-api-server-6d0f94f3b186.herokuapp.com",
  NEXT_PUBLIC_CLIENT_API_URL: "https://pump-client-server-ddd5e3eed248.herokuapp.com",
  NEXT_PUBLIC_PUMP_PROGRAM_ID: "67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV",
  // Shared Helius RPC so every fork/mirror works out of the box (websockets +
  // getProgramAccounts etc. — the public mainnet-beta endpoint 403s/has no ws).
  // Override NEXT_PUBLIC_SOLANA_API_URL with your own key to use your own quota.
  NEXT_PUBLIC_SOLANA_API_URL:
    "https://mainnet.helius-rpc.com/?api-key=dc8a996c-1c31-4960-b000-c4586d54f4bb",
  NEXT_PUBLIC_SOLANA_API_URL2:
    "https://mainnet.helius-rpc.com/?api-key=dc8a996c-1c31-4960-b000-c4586d54f4bb",
  // Address Lookup Table holding the ~28 static program/PDA/mint/pool addresses
  // so the bundle legs (esp. swap-heavy add_liq) fit under the 1232-byte tx cap.
  NEXT_PUBLIC_BUNDLE_LUT: "zkahLXTe1tDUQwm53t1WEFvs8QhNjj19bJg2BhMMGWb",
  NEXT_PUBLIC_ENABLE_ADD_LIQ: "true",
  // ALL THREE add_liq venues live (SOL + USDC + HOUSE). SOL is a pure single-sided
  // WSOL deposit (no swap). USDC/HOUSE first swap/buy their quote and are kept only
  // when a per-trade bundle sim shows no real swap revert (else rotate to SOL) — so
  // turning them on can't brick a buy. Set to "false" as a kill switch (SOL-only).
  NEXT_PUBLIC_ADD_LIQ_SWAP_VENUES: "true",
  // ON: if a coin has NO currently-valid LP position on any venue, the trade flow
  // opens a fresh in-range SOL position (trader-signed, ~0.06 SOL rent) BEFORE
  // broadcasting the bundle, so "1/3 to LP" still fires on new/drifted coins. Set
  // to "false" to disable (then add_liq just skips when no valid position exists).
  NEXT_PUBLIC_INIT_LP_ON_TRADE: "true",
  // ON: every new coin opens all 3 Orca venues (SOL/USDC/HOUSE) + LP positions
  // at creation, so per-trade add_liq can rotate across all three from day one.
  // Resilient (create never fails if this does); creator pays ~0.47 SOL rent.
  NEXT_PUBLIC_OPEN_VENUES_ON_CREATE: "true",
};

const env = Object.fromEntries(
  Object.entries(SHARED_DEFAULTS).map(([k, d]) => [k, withDefault(k, d)])
);

const nextConfig = {
  images: {
    domains: ["pbs.twimg.com"],
  },
  env,
};

module.exports = nextConfig;
