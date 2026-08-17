"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useBrand } from "@/lib/useBrand";

/**
 * Airdrop "proof of spend" leaderboard. Pulls raw per-wallet metrics + live
 * $Pump ICO price from /api/airdrop (server-side, 60s revalidate) and applies
 * the anti-gaming scoring curve client-side so the knobs are instant.
 */

type Wallet = {
  wallet: string;
  username: string | null;
  buySol: number;
  sellSol: number;
  grossSol: number;
  netSol: number;
  feesPaidSol: number;
  trades: number;
  buys: number;
  sells: number;
  distinctMints: number;
  activeWeeks: number;
  washResistance: number;
  coinsCreated: number;
  coinsWithVenues: number;
  venueRentSol: number;
};

type PumpIco = {
  symbol: string;
  priceUsd: number | null;
  priceSol: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  fetchedAt: string;
} | null;

type ApiResponse = {
  generatedAt: string;
  pumpIco: PumpIco;
  totals: { wallets: number; coins: number; trades: number; coinsWithVenues: number; grossVolumeSol: number };
  wallets: Wallet[];
};

const CURVE = [
  { id: "linear", label: "Linear" },
  { id: "sqrt", label: "√ Sqrt" },
  { id: "cbrt", label: "∛ Cube-root" },
  { id: "log", label: "Log" },
];
const WASH = [
  { id: "off", label: "Off" },
  { id: "mild", label: "Mild" },
  { id: "harsh", label: "Harsh" },
];
const CAP = [
  { id: "none", label: "None" },
  { id: "0.10", label: "10%" },
  { id: "0.05", label: "5%" },
];
const ROLE = [
  { id: "all", label: "All" },
  { id: "traders", label: "Trad00rs" },
  { id: "creators", label: "Orca creators" },
];
const SORT = [
  { id: "share", label: "Share" },
  { id: "paid", label: "Money paid" },
  { id: "gross", label: "Gross vol" },
  { id: "net", label: "Net in" },
  { id: "wash", label: "Wash" },
  { id: "trades", label: "Trades" },
];
// Weekly Streamflow unlock tranches (% of total $Pump ICO supply). Sum ≈ 26.8%
// ≈ the locked 26% stake. Each week another tranche unlocks and is distributed.
const TRANCHES = [
  { id: "8.11", label: "Tranche 1 — 8.11%" },
  { id: "7.14", label: "Tranche 2 — 7.14%" },
  { id: "6", label: "Tranche 3 — 6%" },
  { id: "5.53", label: "Tranche 4 — 5.53%" },
];

const curveOf = (x: number, mode: string) => {
  if (x <= 0) return 0;
  if (mode === "linear") return x;
  if (mode === "sqrt") return Math.sqrt(x);
  if (mode === "cbrt") return Math.cbrt(x);
  return Math.log1p(x / 0.01);
};
const washPowOf = (mode: string) => (mode === "off" ? 0 : mode === "harsh" ? 2 : 1);
const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

function Pills({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            "text-xs px-2 py-1 rounded border transition-colors",
            value === o.id
              ? "bg-green-300 text-black border-green-300 font-bold"
              : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function AirdropPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [curve, setCurve] = useState("sqrt");
  const [wash, setWash] = useState("mild");
  const [cap, setCap] = useState("none");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("share");
  const [tranchePct, setTranchePct] = useState("8.11");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/airdrop");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiResponse;
        if (alive) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60_000); // re-pull data + price every 60s
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const price = data?.pumpIco;
  const priceUsd = price?.priceUsd ?? 0;
  const priceSol = price?.priceSol ?? 0;
  const washPow = washPowOf(wash);
  const capFrac = cap === "none" ? 1 : Number(cap);
  // Total supply implied by mcap/price (≈ 1B); tranche is a % of supply.
  const supply =
    priceUsd && data?.pumpIco?.marketCapUsd ? data.pumpIco.marketCapUsd / priceUsd : 1_000_000_000;
  const trancheTokens = (Number(tranchePct) / 100) * supply;
  const trancheUsd = trancheTokens * priceUsd;
  const trancheSol = trancheTokens * priceSol;

  const scored = useMemo(() => {
    const wallets = data?.wallets ?? [];
    const base = wallets.map((r) => {
      const effFees = r.feesPaidSol * Math.pow(Math.max(0, Math.min(1, r.washResistance)), washPow);
      const paid = effFees + r.venueRentSol;
      const score = curveOf(paid, curve);
      const roleLabel = r.coinsWithVenues > 0 && r.grossSol > 0 ? "both" : r.coinsWithVenues > 0 ? "creator" : "trader";
      return { ...r, paid, score, roleLabel };
    });
    const total = base.reduce((s, x) => s + x.score, 0) || 1;
    let shares = base.map((x) => x.score / total);
    if (capFrac < 1) {
      for (let i = 0; i < 25; i++) {
        if (!shares.some((s) => s > capFrac + 1e-9)) break;
        let capped = 0;
        let freeSum = 0;
        shares.forEach((s) => (s > capFrac ? (capped += capFrac) : (freeSum += s)));
        const remaining = 1 - capped;
        shares = shares.map((s) => (s > capFrac ? capFrac : freeSum > 0 ? (s / freeSum) * remaining : s));
      }
    }
    return base
      .map((x, i) => ({ ...x, share: shares[i], alloc: shares[i] * trancheTokens, allocUsd: shares[i] * trancheTokens * priceUsd }))
      .filter((x) => x.paid > 0);
  }, [data, curve, washPow, capFrac, trancheTokens, priceUsd]);

  const traders = scored.filter((x) => x.grossSol > 0).length;
  const creators = scored.filter((x) => x.coinsWithVenues > 0).length;

  const view = useMemo(() => {
    const q = search.trim().toLowerCase();
    let v = scored.filter((x) => {
      if (role === "traders" && !(x.grossSol > 0)) return false;
      if (role === "creators" && !(x.coinsWithVenues > 0)) return false;
      if (q && !(x.wallet.toLowerCase().includes(q) || (x.username ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
    const key = (x: (typeof v)[number]) =>
      sort === "paid" ? x.paid : sort === "gross" ? x.grossSol : sort === "net" ? x.netSol : sort === "wash" ? x.washResistance : sort === "trades" ? x.trades : x.share;
    return [...v].sort((a, b) => key(b) - key(a));
  }, [scored, search, role, sort]);

  const brand = useBrand();

  return (
    <div className="max-w-6xl mx-auto p-4 text-white w-full">
      <h1 className="text-2xl font-bold">{brand} airdrop — proof of spend</h1>
      <p className="text-sm text-gray-400 mt-1">
        Ranks wallets by <span className="text-white font-semibold">real SOL paid into the system</span> — trad00rs by
        trading fees + creators by Orca venue rent. Score is concave and wash-discounted, so trading too much (or
        round-tripping) yields diminishing airdrop.
      </p>

      <div className="border border-amber-500/60 bg-amber-500/10 text-amber-300 rounded p-3 mt-3 text-sm">
        <span className="font-bold">Work in progress — not final.</span> The algo and allocations are not final. This is
        for sussing out obvious abuse and is a work in progress.
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
        <Stat value={loading ? "…" : String(scored.length)} label="Qualifying wallets" />
        <Stat value={loading ? "…" : String(traders)} label="Trad00rs" accent="green" />
        <Stat value={loading ? "…" : String(creators)} label="Orca creators" accent="green" />
        <Stat value={priceUsd ? `$${priceUsd.toFixed(6)}` : "—"} label="$Pump ICO price" accent="green" />
        <Stat value={priceUsd ? `$${fmtInt(trancheUsd)}` : "—"} label="Tranche value" accent="amber" />
        <Stat value={loading ? "…" : data?.totals.grossVolumeSol.toFixed(1) ?? "—"} label="Gross vol ◎" />
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-3">
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search wallet or username…"
            className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-green-300"
          />
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500">weekly tranche</span>
            <select
              value={tranchePct}
              onChange={(e) => setTranchePct(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-green-300"
            >
              {TRANCHES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              {fmtInt(trancheTokens)} $Pump ICO ≈ ${fmtInt(trancheUsd)} · {trancheSol.toFixed(2)} ◎
            </span>
          </div>
        </div>
        <div className="flex gap-5 items-center flex-wrap">
          <Labeled label="Curve"><Pills options={CURVE} value={curve} onChange={setCurve} /></Labeled>
          <Labeled label="Wash penalty"><Pills options={WASH} value={wash} onChange={setWash} /></Labeled>
          <Labeled label="Cap"><Pills options={CAP} value={cap} onChange={setCap} /></Labeled>
        </div>
        <div className="flex gap-5 items-center flex-wrap">
          <Labeled label="Show"><Pills options={ROLE} value={role} onChange={setRole} /></Labeled>
          <Labeled label="Sort"><Pills options={SORT} value={sort} onChange={setSort} /></Labeled>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        score = curve( feesPaid × washResistance^washPow + venueRent ). Concave curve normalizes whales; wash discount
        cuts churn-for-airdrop; venue rent is real spend, never discounted. Amber rows are churny (wash &lt; 20% on
        &gt;1◎ gross).
      </p>

      {error && <p className="text-red-400 text-sm mt-3">Failed to load: {error}</p>}

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-gray-800 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 sticky top-0">
            <tr>
              {["#", "wallet", "role", "paid ◎", "gross ◎", "net ◎", "wash", "trades", "coins/orca", "share", "alloc (Pump ICO)", "≈ USD"].map((h, i) => (
                <th key={h} className={clsx("px-2 py-2 font-medium whitespace-nowrap", i <= 2 ? "text-left" : "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((x, i) => {
              const churny = x.washResistance < 0.2 && x.grossSol > 1;
              return (
                <tr key={x.wallet} className={clsx("border-t border-gray-800 hover:bg-gray-900/50", i % 2 ? "bg-gray-900/20" : "")}>
                  <td className="px-2 py-1.5 text-right text-gray-500">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <span className={clsx(churny && "text-amber-400")}>
                      {churny && <span title="churny — likely wash">⚠ </span>}
                      {x.username ? <span className="text-white">{x.username} </span> : null}
                      <span className="text-gray-500 font-mono text-xs">{short(x.wallet)}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-400">{x.roleLabel}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{x.paid.toFixed(4)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-400">{x.grossSol.toFixed(3)}</td>
                  <td className={clsx("px-2 py-1.5 text-right font-mono", x.netSol < 0 ? "text-red-400" : "text-gray-400")}>{x.netSol.toFixed(3)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-400">{Math.round(x.washResistance * 100)}%</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-400">{x.trades}</td>
                  <td className="px-2 py-1.5 text-center text-gray-400">{x.coinsCreated}/{x.coinsWithVenues}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-green-300">{(x.share * 100).toFixed(2)}%</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmtInt(x.alloc)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-400">${x.allocUsd.toFixed(2)}</td>
                </tr>
              );
            })}
            {!loading && view.length === 0 && (
              <tr>
                <td colSpan={12} className="px-2 py-6 text-center text-gray-500">
                  No wallets match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        alloc = share × {fmtInt(trancheTokens)} $Pump ICO · paid ◎ = wash-discounted fees + venue rent · coins/orca =
        coins created / with Orca venues.{" "}
        {price ? `$Pump ICO @ $${(price.priceUsd ?? 0).toFixed(6)} · price/data refresh every 60s.` : ""}
        {data ? ` Updated ${new Date(data.generatedAt).toLocaleTimeString()}.` : ""}
      </p>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: "green" | "amber" }) {
  return (
    <div className="border border-gray-800 rounded p-3">
      <div className={clsx("text-xl font-bold", accent === "green" ? "text-green-300" : accent === "amber" ? "text-amber-300" : "text-white")}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
