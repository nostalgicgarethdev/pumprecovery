"use client";

import { useEffect, useState } from "react";

/**
 * Platform-wide flywheel cards for the landing page (next to KingOfTheHill):
 * global DEX TVL + 24h volume, total referral income (est.), and total
 * $Pump ICO burned. Data from /api/global-stats (server-proxied + cached 5m).
 */

type G = {
  tvlUsd: number;
  volume24hUsd: number;
  refIncomeUsd: number;
  burnedTokens: number;
  burnedUsd: number;
} | null;

const fmtUsd = (n: number) =>
  n >= 1e6
    ? `$${(n / 1e6).toFixed(2)}M`
    : n >= 1e3
    ? `$${(n / 1e3).toFixed(1)}K`
    : `$${n.toFixed(2)}`;

const fmtNum = (n: number) =>
  n >= 1e6
    ? `${(n / 1e6).toFixed(2)}M`
    : n >= 1e3
    ? `${(n / 1e3).toFixed(1)}K`
    : Math.round(n).toLocaleString();

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "white";
}) {
  return (
    <div className="border border-gray-800 rounded p-3 min-w-[150px]">
      <div className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div
        className={
          "text-lg font-bold mt-0.5 " +
          (accent === "green" ? "text-green-300" : "text-white")
        }
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function GlobalStats() {
  const [g, setG] = useState<G>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/stats/global`
        );
        if (!r.ok) return;
        const j = await r.json();
        if (j.error) return;
        if (alive) setG(j);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 300_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-[560px]">
      <Card
        label="DEX TVL"
        value={g ? fmtUsd(g.tvlUsd) : "…"}
        sub={g ? `${fmtUsd(g.volume24hUsd)} 24h vol` : undefined}
        accent="green"
      />
      <Card
        label="referrers earned"
        value={g ? fmtUsd(g.refIncomeUsd) : "…"}
        sub="est. · 1/3 of all fees"
        accent="white"
      />
      <Card
        label="$Pump ICO burned"
        value={g ? fmtNum(g.burnedTokens) : "…"}
        sub={g ? `≈ ${fmtUsd(g.burnedUsd)} · buy & burn` : undefined}
        accent="green"
      />
    </div>
  );
}
