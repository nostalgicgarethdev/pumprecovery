PUMPFUN SOURCE CODE LEAKED FOR THE PUBLIC

# Deploy a mirror

**One click and you've got your own stacc.art — and your wallet earns the
top-of-tree referral fees on every trade that runs through it.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnostalgicgarethdev%2Fpumprecovery&root-directory=pump%2Fpump-v2-frontend&project-name=stacc-mirror&repository-name=stacc-mirror&env=NEXT_PUBLIC_DEFAULT_REFERRER&envDescription=Your%20Solana%20wallet%20%E2%80%94%20earns%20top-of-tree%20referral%20fees%20on%20this%20mirror&envLink=https%3A%2F%2Fgithub.com%2Fnostalgicgarethdev%2Fpumprecovery%2Fblob%2Fmain%2Fpump%2Fpump-v2-frontend%2F.env.example)



## What this is

An open-source bonding-curve token launchpad on Solana. Every trade is an atomic,
same-slot, un-sandwichable bundle whose fees flow into a flywheel: **1/3 to a
3-deep referral tree, 1/3 to permanent Orca liquidity, 1/3 to buy & burn**. The
same build runs on the canonical site and on any number of mirrors — brand,
default referrer, and backends are all env-driven.

## How the mirror index works

- Mirrors aren't added by hand. The shared backend records every live mirror
  origin (the browser sets the `Origin` header on sign-in / page-load pings) plus
  the mirror's configured top-level referrer.
- `stacc.show` reads that live list, health-checks each mirror, and 302-forwards
  deep links (`stacc.show/<mint>?ref=…`) to a working one — preserving path + ref.

Not affiliated with or endorsed by pump.fun.
