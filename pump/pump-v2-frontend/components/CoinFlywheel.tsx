"use client";

import { useEffect, useState } from "react";

/**
 * Per-coin flywheel receipts: referrers earned + $Pump ICO burned, driven by
 * this coin's trading. Data from /api/coin-flywheel (server-proxied + cached).
 * Both are volume-derived estimates (1/3 of fees each) — labeled "est."
 */

type F = {
  refIncomeUsd: number;
  burnUsd: number;
} | null;

const fmtUsd = (n: number) =>
  n >= 1e6
    ? `$${(n / 1e6).toFixed(2)}M`
    : n >= 1e3
    ? `$${(n / 1e3).toFixed(1)}K`
    : `$${n.toFixed(2)}`;

export function CoinFlywheel({ mint }: { mint: string }) {
  const [f, setF] = useState<F>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/stats/coin-flywheel?mint=${mint}`
        );
        if (!r.ok) return;
        const j = await r.json();
        if (j.unavailable) {
          if (alive) setHidden(true);
          return;
        }
        if (j.error) return;
        if (alive)
          setF({ refIncomeUsd: j.refIncomeUsd || 0, burnUsd: j.burnUsd || 0 });
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 120_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [mint]);

  // Stats not configured on this deploy (e.g. a mirror) — hide rather than 500.
  if (hidden) return null;

  return (
    <div className="border border-gray-800 rounded p-3 w-full">
      <div className="text-xs text-gray-400 mb-2">flywheel (this coin)</div>
      <div className="flex gap-6">
        <div>
          <div className="text-[11px] text-gray-500">referrers earned</div>
          <div className="text-green-300 font-bold text-sm">
            {f ? fmtUsd(f.refIncomeUsd) : "…"}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-gray-500">→ buy &amp; burn $Pump ICO</div>
          <div className="text-white font-bold text-sm">
            {f ? fmtUsd(f.burnUsd) : "…"}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mt-2 leading-snug">
        est. — each fee splits 1/3 referrers · 1/3 LP · 1/3 buy&amp;burn. Total
        $Pump&nbsp;ICO actually burned is on the board.
      </p>
    </div>
  );
}
