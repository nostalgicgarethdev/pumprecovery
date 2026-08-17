# Deploy a mirror

**One click and you've got your own stacc.art — and your wallet earns the
top-of-tree referral fees on every trade that runs through it.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnostalgicgarethdev%2Fpumprecovery&root-directory=pump%2Fpump-v2-frontend&project-name=stacc-mirror&repository-name=stacc-mirror&env=NEXT_PUBLIC_DEFAULT_REFERRER&envDescription=Your%20Solana%20wallet%20%E2%80%94%20earns%20top-of-tree%20referral%20fees%20on%20this%20mirror&envLink=https%3A%2F%2Fgithub.com%2Fnostalgicgarethdev%2Fpumprecovery%2Fblob%2Fmain%2Fpump%2Fpump-v2-frontend%2F.env.example)

It prompts for **one** thing — your wallet (`NEXT_PUBLIC_DEFAULT_REFERRER`). The
shared backends are baked in, so it just works. Your mirror then **self-registers**
on the live index at **[stacc.show](https://stacc.show)**, with a running tally of
its referrer's earnings. → [Full setup / what's secret](pump/pump-v2-frontend/README.md)

> ⚠ **Mirrors are untrusted.** Treat any mirror like a Piratebay mirror: shop
> around, use burner wallets, never more than you can afford to lose. This code is
> open-source and there's no assurance a given deploy hasn't been nefariously
> modified.
>
> _You managed to get Google to b& stacc.art: I raise you a game of whack-a-mole._

---

## What this is

An open-source bonding-curve token launchpad on Solana. Every trade is an atomic,
same-slot, un-sandwichable bundle whose fees flow into a flywheel: **1/3 to a
3-deep referral tree, 1/3 to permanent Orca liquidity, 1/3 to buy & burn**. The
same build runs on the canonical site and on any number of mirrors — brand,
default referrer, and backends are all env-driven.

## Repo layout

| Path | What |
| --- | --- |
| [`pump/pump-v2-frontend`](pump/pump-v2-frontend) | The Next.js launchpad UI. **[Deploy your own mirror →](pump/pump-v2-frontend/README.md)** |
| [`pump/stacc-show`](pump/stacc-show) | `stacc.show` — live mirror index + failover redirector |
| `pump/pump-v2-client-server` | Shared NestJS backend (auth, coins, trades, mirror indexer) |
| `pump/pump-contracts-solana` | The on-chain Anchor program (`67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV`) |

## How the mirror index works

- Mirrors aren't added by hand. The shared backend records every live mirror
  origin (the browser sets the `Origin` header on sign-in / page-load pings) plus
  the mirror's configured top-level referrer.
- `stacc.show` reads that live list, health-checks each mirror, and 302-forwards
  deep links (`stacc.show/<mint>?ref=…`) to a working one — preserving path + ref.

Not affiliated with or endorsed by pump.fun.
