"use client";

import { useEffect, useState } from "react";

/**
 * Surfaces the coin's $ DEX liquidity + 24h volume, from Birdeye's aggregate
 * token_overview (server-proxied + cached via /api/orca-tvl). Aggregate is used
 * deliberately — the per-pool markets endpoint is noisy for tiny pools. The 3
 * Orca whirlpools (SOL / USDC / $Pump ICO) are the core venues and are linked
 * out for DYOR.
 */

type Stats = { tvl: number; vol: number; orcaPools: number } | null;

const fmtUsd = (n: number) =>
  n >= 1e6
    ? `$${(n / 1e6).toFixed(2)}M`
    : n >= 1e3
    ? `$${(n / 1e3).toFixed(1)}K`
    : `$${n.toFixed(0)}`;

export function OrcaPoolStats({ mint }: { mint: string }) {
  const [stats, setStats] = useState<Stats>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/stats/orca-tvl?mint=${mint}`
        );
        if (!res.ok) return;
        const j = await res.json();
        if (j.unavailable) {
          if (alive) setHidden(true);
          return;
        }
        if (j.error) return;
        if (alive)
          setStats({
            tvl: j.tvl || 0,
            vol: j.vol || 0,
            orcaPools: j.orcaPools || 0,
          });
      } catch {
        /* ignore — leave in seeding state */
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [mint]);

  // Stats not configured on this deploy (e.g. a mirror) — hide entirely.
  if (hidden) return null;

  const orcaUrl = `https://www.orca.so/pools?tokens=${mint}`;
  const OrcaLink = () => (
    <a
      href={orcaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] text-green-300 hover:text-green-200 hover:underline"
    >
      view on Orca ↗
    </a>
  );

  // No DEX liquidity indexed yet — keep it honest, not empty.
  if (!stats || stats.tvl <= 0) {
    return (
      <div className="border border-gray-800 rounded p-3 w-full">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">orca venues</span>
          <OrcaLink />
        </div>
        <p className="text-[11px] text-gray-500 mt-1 leading-snug">
          3 whirlpools live (SOL / USDC / $Pump&nbsp;ICO) — seeding liquidity as
          the 1/3 LP fee accrues on every trade.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-800 rounded p-3 w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400">liquidity</span>
        <OrcaLink />
      </div>
      <div className="flex gap-6">
        <div>
          <div className="text-[11px] text-gray-500">TVL</div>
          <div className="text-green-300 font-bold text-sm">{fmtUsd(stats.tvl)}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-500">24h volume</div>
          <div className="text-white font-bold text-sm">{fmtUsd(stats.vol)}</div>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mt-2 leading-snug">
        Birdeye aggregate across venues · 3 Orca whirlpools (SOL / USDC /
        $Pump&nbsp;ICO) seeded forever via the 1/3 LP fee.
      </p>
    </div>
  );
}
