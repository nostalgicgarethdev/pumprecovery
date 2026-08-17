# stacc.show — mirror index + failover redirector

A tiny Next.js app that:

- **indexes** the launchpad's mirror domains with **live status** (green/red),
- **302-forwards** any deep link to the first healthy mirror, preserving the path
  and `?ref=` (`stacc.show/<mint>?ref=X` → `workingmirror/<mint>?ref=X`),
- leads with a loud **mirror-trust warning**.

It is intentionally separate from the app so it can live on a clean domain
(`stacc.show`) and keep working when a mirror gets blocklisted.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FstaccDOTsol%2Fpumprecovery&root-directory=pump%2Fstacc-show&project-name=stacc-show&repository-name=stacc-show&env=NEXT_PUBLIC_MIRRORS&envDescription=Comma-separated%20mirror%20origins%20to%20index%2C%20highest%20priority%20first)

When deploying, set **Root Directory** to `pump/stacc-show` (the button does this
for you), then point your domain (`stacc.show`) at the project.

## Configure mirrors

The list is env-driven — no redeploy of code needed, just edit the env:

```
NEXT_PUBLIC_MIRRORS=https://stacc.art,https://staccmirror.xyz,https://anotherstacc.app
```

- Order = priority (first healthy one wins).
- Origins only (scheme + host), no trailing slash.
- Falls back to the baked default list in `lib/mirrors.ts` if unset.

Optional: `NEXT_PUBLIC_REGISTRY_BRAND` (defaults to `stacc.show`).

## Why 302 (not 301)

The redirect is a **302 (temporary)** with `Cache-Control: no-store` on purpose:
a `301` is cached permanently by browsers, which would pin a visitor to a mirror
that later dies and defeat the whole point of failover. 302 lets the choice
re-evaluate on every visit.

## Local dev

```
pnpm install   # or npm install
pnpm dev       # http://localhost:3000
```
