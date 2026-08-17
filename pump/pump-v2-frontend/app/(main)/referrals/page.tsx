"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

/**
 * Public referral tree. Search any address/username to see its upstream chain
 * (who referred them, up to the root) and downstream subtree (everyone they
 * referred, recursively). Click any node to re-center. Data from /api/referrals
 * (server-proxied + cached on-chain referral_record graph).
 */

type Node = { a: string; p: string | null; u: string | null };

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const sol = (n: number) =>
  n >= 1 ? n.toFixed(2) : n >= 0.001 ? n.toFixed(4) : n > 0 ? n.toFixed(6) : "0";

export default function ReferralsPage() {
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  // Per-wallet trade volume (grossSol) + fee bps, from /api/airdrop, used to estimate
  // each node's referral earnings. The fee is 1/3 referral, split into 3 equal tiers
  // (each fee/9 = volume * feeBps/10000/9), so a wallet earns that rate on the volume
  // of EVERY referee within 3 levels below it (the 3-deep tree).
  const [vol, setVol] = useState<{ map: Map<string, number>; rate: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/referrals");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (j.error) throw new Error(j.error);
        if (alive) setNodes(j.nodes || []);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/airdrop");
        if (!r.ok) return;
        const j = await r.json();
        const map = new Map<string, number>();
        for (const w of j.wallets ?? []) {
          if (w?.wallet) map.set(w.wallet, Number(w.grossSol) || 0);
        }
        const feeBps = Number(j?.assumptions?.FEE_BPS) || 100;
        if (alive) setVol({ map, rate: feeBps / 10000 / 9 });
      } catch {
        /* earnings are best-effort; tree still renders without them */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const g = useMemo(() => {
    const nameMap = new Map<string, string | null>();
    const parentMap = new Map<string, string | null>();
    const childrenMap = new Map<string, string[]>();
    for (const n of nodes ?? []) {
      nameMap.set(n.a, n.u);
      parentMap.set(n.a, n.p);
      if (n.p) {
        const arr = childrenMap.get(n.p) ?? [];
        arr.push(n.a);
        childrenMap.set(n.p, arr);
      }
    }
    const sizeCache = new Map<string, number>();
    const subtreeSize = (a: string): number => {
      if (sizeCache.has(a)) return sizeCache.get(a)!;
      sizeCache.set(a, 0); // guard cycles
      const kids = childrenMap.get(a) ?? [];
      let s = kids.length;
      for (const k of kids) s += subtreeSize(k);
      sizeCache.set(a, s);
      return s;
    };
    const roots = (nodes ?? []).filter((n) => n.p == null).map((n) => n.a);
    return { nameMap, parentMap, childrenMap, subtreeSize, roots };
  }, [nodes]);

  // Estimated referral earnings (SOL) for a wallet: its tier rate (fee/9 of volume)
  // times the total trade volume of every referee within 3 levels below it.
  const earningsOf = useMemo(() => {
    const cache = new Map<string, number>();
    return (a: string): number => {
      if (!vol) return 0;
      const hit = cache.get(a);
      if (hit !== undefined) return hit;
      let v = 0;
      const seen = new Set<string>([a]);
      let frontier = [a];
      for (let depth = 1; depth <= 3; depth++) {
        const next: string[] = [];
        for (const node of frontier) {
          for (const kid of g.childrenMap.get(node) ?? []) {
            if (seen.has(kid)) continue;
            seen.add(kid);
            v += vol.map.get(kid) ?? 0;
            next.push(kid);
          }
        }
        frontier = next;
      }
      const e = v * vol.rate;
      cache.set(a, e);
      return e;
    };
  }, [g, vol]);

  const totalEarned = useMemo(
    () => (vol ? (nodes ?? []).reduce((s, n) => s + earningsOf(n.a), 0) : 0),
    [vol, nodes, earningsOf]
  );

  useEffect(() => {
    if (nodes && nodes.length && !focused) {
      const top =
        [...g.roots].sort((a, b) => g.subtreeSize(b) - g.subtreeSize(a))[0] ??
        nodes[0]?.a ??
        null;
      setFocused(top);
    }
  }, [nodes, focused, g]);

  const label = (a: string) => g.nameMap.get(a) || short(a);

  const ancestors = (a: string): string[] => {
    const out: string[] = [];
    let cur = g.parentMap.get(a) ?? null;
    const seen = new Set<string>([a]);
    while (cur && !seen.has(cur)) {
      out.push(cur);
      seen.add(cur);
      cur = g.parentMap.get(cur) ?? null;
    }
    return out; // [parent, grandparent, … root]
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (nodes ?? [])
      .filter(
        (n) =>
          n.a.toLowerCase().includes(q) || (n.u ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => g.subtreeSize(b.a) - g.subtreeSize(a.a))
      .slice(0, 8);
  }, [query, nodes, g]);

  const go = (a: string) => {
    setFocused(a);
    setQuery("");
  };
  const copy = async (a: string) => {
    try {
      await navigator.clipboard.writeText(a);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const total = nodes?.length ?? 0;
  const up = focused ? ancestors(focused) : [];
  const kids = focused
    ? [...(g.childrenMap.get(focused) ?? [])].sort(
        (a, b) => g.subtreeSize(b) - g.subtreeSize(a)
      )
    : [];

  const NodeChip = ({
    addr,
    accent,
    sub,
  }: {
    addr: string;
    accent?: "focus" | "up" | "down";
    sub?: string;
  }) => (
    <button
      onClick={() => go(addr)}
      title={addr}
      className={clsx(
        "text-left rounded border px-3 py-2 transition-colors",
        accent === "focus"
          ? "border-green-400 bg-green-300/10"
          : "border-gray-700 bg-gray-900/40 hover:border-gray-500 hover:bg-gray-900"
      )}
    >
      <div
        className={clsx(
          "text-sm font-bold truncate",
          accent === "focus" ? "text-green-300" : "text-white"
        )}
      >
        {g.nameMap.get(addr) || short(addr)}
      </div>
      <div className="text-[11px] text-gray-500 font-mono truncate">
        {short(addr)}
      </div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 text-white w-full">
      <h1 className="text-2xl font-bold">referral tree</h1>
      <p className="text-sm text-gray-400 mt-1">
        Search any wallet or username to see who referred them (upstream) and
        everyone they&apos;ve referred (downstream). Click any node to re-center.
      </p>

      {/* search */}
      <div className="mt-4 relative max-w-md">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search wallet or username…"
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-300"
        />
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-gray-900 border border-gray-700 rounded overflow-hidden">
            {matches.map((m) => (
              <button
                key={m.a}
                onClick={() => go(m.a)}
                className="w-full text-left px-3 py-2 hover:bg-gray-800 flex items-center justify-between gap-2"
              >
                <span className="text-sm">{m.u || short(m.a)}</span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {short(m.a)} · {g.subtreeSize(m.a)} below
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mt-4">Failed to load: {error}</p>}
      {!nodes && !error && <p className="text-gray-500 text-sm mt-4">loading graph…</p>}

      {nodes && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Stat value={String(total)} label="members" />
          <Stat value={String(g.roots.length)} label="roots" />
          <Stat
            value={focused ? String(g.subtreeSize(focused)) : "—"}
            label="downstream of focus"
          />
          <Stat
            value={vol ? `◎${sol(totalEarned)}` : "…"}
            label="est. referral earned (all)"
            accent
          />
        </div>
      )}

      {focused && (
        <div className="mt-6 flex flex-col items-center gap-1">
          {/* upstream: root → … → parent */}
          {up.length > 0 && (
            <div className="text-[11px] text-gray-500 uppercase tracking-wide self-start mb-1">
              ▲ upstream (referred by)
            </div>
          )}
          {[...up].reverse().map((a) => (
            <div key={a} className="flex flex-col items-center">
              <div className="w-full max-w-xs">
                <NodeChip
                  addr={a}
                  accent="up"
                  sub={
                    vol
                      ? `${g.subtreeSize(a)} down · ◎${sol(earningsOf(a))} earned`
                      : `${g.subtreeSize(a)} downstream`
                  }
                />
              </div>
              <div className="text-gray-600">↓</div>
            </div>
          ))}

          {/* focused node */}
          <div className="w-full max-w-md">
            <div className="rounded border border-green-400 bg-green-300/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-green-300 truncate">
                    {label(focused)}
                  </div>
                  <div className="text-xs text-gray-400 font-mono break-all">
                    {focused}
                  </div>
                </div>
                <button
                  onClick={() => copy(focused)}
                  className="shrink-0 text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500"
                >
                  {copied ? "✓ copied" : "copy"}
                </button>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>
                  <span className="text-white font-bold">{kids.length}</span> direct
                </span>
                <span>
                  <span className="text-white font-bold">{g.subtreeSize(focused)}</span>{" "}
                  total downstream
                </span>
                <span>
                  depth <span className="text-white font-bold">{up.length}</span>
                </span>
                {vol && (
                  <span>
                    est. earned{" "}
                    <span className="text-green-300 font-bold">
                      ◎{sol(earningsOf(focused))}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* downstream */}
          {kids.length > 0 && (
            <>
              <div className="text-gray-600 mt-1">↓</div>
              <div className="text-[11px] text-gray-500 uppercase tracking-wide self-start mb-1">
                ▼ downstream ({kids.length} direct referees)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 w-full">
                {kids.map((a) => {
                  const sz = g.subtreeSize(a);
                  const e = vol ? earningsOf(a) : 0;
                  const base = sz > 0 ? `+${sz} below` : "leaf";
                  return (
                    <NodeChip
                      key={a}
                      addr={a}
                      accent="down"
                      sub={vol && e > 0 ? `${base} · ◎${sol(e)}` : base}
                    />
                  );
                })}
              </div>
            </>
          )}
          {kids.length === 0 && up.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              no downstream referrals yet — this is a leaf.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-gray-800 rounded p-3">
      <div className={clsx("text-xl font-bold", accent ? "text-green-300" : "text-white")}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
