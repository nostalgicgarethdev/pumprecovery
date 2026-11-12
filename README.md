# pumprecovery

CA: [`DdrZt6fHnN6dhSCR7w22z9dPyM2e9L9Dp9RWK315pump`](https://pump.fun/coin/DdrZt6fHnN6dhSCR7w22z9dPyM2e9L9Dp9RWK315pump)

Saved copy of the pump.fun source tree. The 2024 frontend, the Solana bonding-curve program, the AMM programs, and the NestJS servers are all in `pump/`. Later experiments that lived in the same tree are here too.

This is not an official pump.fun repository.

## The pump.fun app

| Path | What |
| --- | --- |
| [`pump/editfrontend`](pump/editfrontend) | Next.js frontend. Board, coin page, create, trade box. |
| [`pump/kothanimate`](pump/kothanimate) | Same frontend with the king-of-the-hill animation. |
| [`pump/pumpagainfe`](pump/pumpagainfe) | Another copy of that frontend. |
| [`pump/pump-contracts-solana`](pump/pump-contracts-solana) | Anchor bonding curve. Coins trade immediately, no seeded liquidity. At the cap, liquidity moves to Raydium and the LP tokens are burned. Program id `67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV`. |
| [`pump/pumpitydumpity`](pump/pumpitydumpity) | Earlier cut of that bonding-curve program. |
| [`pump/pump-amm`](pump/pump-amm) | AMM program (`pump_v2_amm_again_again`). |
| [`pump/pump-v2-amm`](pump/pump-v2-amm) | AMM variant. |
| [`pump/pump-real-amm`](pump/pump-real-amm) | AMM variant. |
| [`pump/pumpitydooda`](pump/pumpitydooda) | AMM variant. |
| [`pump/pump-v2-server`](pump/pump-v2-server) | NestJS API. |
| [`pump/pump-v2-client-server`](pump/pump-v2-client-server) | NestJS client API. Auth, coins, trades, send-transaction. |
| [`pump/pump-v2-metrics-server`](pump/pump-v2-metrics-server) | Metrics server. |
| [`pump/pump-cache-server`](pump/pump-cache-server) | Cache server. |
| [`pump/pump-v2-supabase`](pump/pump-v2-supabase) | Supabase project that backed the app. |
| [`pump/openai-pump-fun`](pump/openai-pump-fun) | Scripts from the AI pump.fun experiment. |

Run the classic frontend:

```bash
cd pump/editfrontend
npm install
npm run dev
```

## Also in this tree

| Path | What |
| --- | --- |
| [`pump/pump-v2-frontend`](pump/pump-v2-frontend) | Launchpad UI you can deploy as your own mirror. Each trade is an atomic same-slot bundle. Fees split **1/3** to a 3-deep referral tree, **1/3** to permanent Orca liquidity, **1/3** to buy & burn. |
| [`pump/stacc-show`](pump/stacc-show) | [stacc.show](https://stacc.show). Live mirror index and failover redirect. |
| [`pump/rune-pump`](pump/rune-pump) | Bitcoin rune minting on a bonding curve. |
| [`pump/pumpfut`](pump/pumpfut) | Futarchy programs. |
| [`pump/pump-meta-dao-fe`](pump/pump-meta-dao-fe) | Meta-DAO frontend. |

## Deploy a mirror

One click clones this repo, sets the root to `pump/pump-v2-frontend`, and asks for your wallet. That wallet earns the top-of-tree referral fee on trades that come in with no `?ref=`. Shared backends are already set, so the mirror runs as soon as it deploys.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnostalgicgarethdev%2Fpumprecovery&root-directory=pump%2Fpump-v2-frontend&project-name=stacc-mirror&repository-name=stacc-mirror&env=NEXT_PUBLIC_DEFAULT_REFERRER&envDescription=Your%20Solana%20wallet%20%E2%80%94%20earns%20top-of-tree%20referral%20fees%20on%20this%20mirror&envLink=https%3A%2F%2Fgithub.com%2Fnostalgicgarethdev%2Fpumprecovery%2Fblob%2Fmain%2Fpump%2Fpump-v2-frontend%2F.env.example)

After it is up, point a domain at the project. Add your own `NEXT_PUBLIC_SOLANA_API_URL` if you do not want to share someone else's RPC quota. Brand follows the domain unless you set `NEXT_PUBLIC_BRAND`.

Mirrors are untrusted. Read the code, use a burner wallet, and keep the size small. Setup notes are in [`pump/pump-v2-frontend/README.md`](pump/pump-v2-frontend/README.md).
