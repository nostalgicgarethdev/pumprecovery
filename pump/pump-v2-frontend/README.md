# stacc.art frontend (mirror-ready)

An open-source Solana bonding-curve launchpad. The same build runs on the
canonical domain and on any number of **mirrors** — the brand, default referrer,
and backends are all env-driven, so spinning up your own mirror is one click.

> ⚠ **Mirrors are untrusted.** Treat any mirror like a Piratebay mirror: shop
> around, use burner wallets, and never more than you can afford to lose. The
> code is open-source and there's no assurance a dev hasn't nefariously changed
> some bits and bytes. The live mirror index is at **stacc.show**.

## 1-click deploy your own mirror

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnostalgicgarethdev%2Fpumprecovery&root-directory=pump%2Fpump-v2-frontend&project-name=stacc-mirror&repository-name=stacc-mirror&env=NEXT_PUBLIC_DEFAULT_REFERRER&envDescription=Your%20Solana%20wallet%20%E2%80%94%20earns%20top-of-tree%20referral%20fees%20on%20this%20mirror&envLink=https%3A%2F%2Fgithub.com%2Fnostalgicgarethdev%2Fpumprecovery%2Fblob%2Fmain%2Fpump%2Fpump-v2-frontend%2F.env.example)

The button clones the repo, sets **Root Directory** to `pump/pump-v2-frontend`,
and prompts for the one thing that should be yours:

- **`NEXT_PUBLIC_DEFAULT_REFERRER`** — your Solana wallet. It earns the
  top-of-tree referral fee whenever a visitor arrives without a `?ref=`.

Everything else has a **shared default baked into `next.config.js`** (same
backends, program ID, flags), so the mirror works immediately. After it's up:

1. Point your domain at the Vercel project.
2. (Recommended) add your **own** `NEXT_PUBLIC_SOLANA_API_URL` (Helius/Triton)
   so heavy on-chain reads work and you're not on someone else's RPC quota.
3. Add your mirror's origin to **stacc.show**'s `NEXT_PUBLIC_MIRRORS` so it shows
   up in the index.

The brand auto-uses your domain (the URL bar) unless you set `NEXT_PUBLIC_BRAND`.

## What's a secret vs. shareable?

See [`.env.example`](./.env.example). Short version:

| Keep secret (server-only, redact)        | Safe to share (public / baked)                |
| ---------------------------------------- | --------------------------------------------- |
| `SUPABASE_KEY` (service_role — full DB!) | backend URLs, `NEXT_PUBLIC_PUMP_PROGRAM_ID`   |
| `BIRDEYE_API_KEY`                         | `NEXT_PUBLIC_DEFAULT_REFERRER` (a wallet addr) |
| `PINATA_API_KEY` / `PINATA_SECRET_API_KEY` | feature flags, `SUPABASE_URL`               |
| your `NEXT_PUBLIC_SOLANA_API_URL` Helius key¹ | `NEXT_PUBLIC_TWITTER_CLIENT_ID`           |

¹ Technically browser-exposed, but it's billable — use your own per mirror.

The server-side secrets are **optional** for a mirror: without them, stats /
airdrop / coin-creation-IPFS degrade, but core trading still works.

## Local dev

```bash
cp .env.example .env.local   # fill in what you need
pnpm install
pnpm dev                     # http://localhost:3000
```
