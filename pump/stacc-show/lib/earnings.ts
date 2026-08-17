import { BACKEND_URL } from "./mirrors";

const PUMP = "67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV";
const HELIUS_KEY =
  process.env.HELIUS_API_KEY?.trim() || "dc8a996c-1c31-4960-b000-c4586d54f4bb";

export async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch(`${BACKEND_URL}/sol-price`, { next: { revalidate: 300 } });
    if (!res.ok) return 0;
    const j = await res.json();
    return Number(j?.solPrice) || 0;
  } catch {
    return 0;
  }
}

/**
 * Recent SOL (lamports) received by `referrer` in transactions that involve the
 * launchpad program — i.e. referral payouts from the per-trade bundle. Uses the
 * Helius Enhanced Transactions API (parsed nativeTransfers), bounded to the most
 * recent ~200 txs and cached, so this is a live *estimate of recent* inflow, not
 * a perfect lifetime ledger.
 */
async function recentReferralLamports(referrer: string): Promise<number> {
  let total = 0;
  let before = "";
  for (let page = 0; page < 2; page++) {
    const url =
      `https://api.helius.xyz/v0/addresses/${referrer}/transactions` +
      `?api-key=${HELIUS_KEY}&limit=100${before ? `&before=${before}` : ""}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) break;
    const txs = await res.json();
    if (!Array.isArray(txs) || txs.length === 0) break;
    for (const tx of txs) {
      const involvesPump =
        (tx.instructions || []).some((i: any) => i.programId === PUMP) ||
        (tx.accountData || []).some((a: any) => a.account === PUMP);
      if (!involvesPump) continue;
      for (const nt of tx.nativeTransfers || []) {
        if (nt.toUserAccount === referrer) total += Number(nt.amount) || 0;
      }
    }
    before = txs[txs.length - 1]?.signature || "";
    if (txs.length < 100) break;
  }
  return total;
}

export async function referrerEarningsUsd(
  referrer: string | null,
  solPrice: number
): Promise<number> {
  if (!referrer) return 0;
  try {
    const lamports = await recentReferralLamports(referrer);
    return (lamports / 1e9) * solPrice;
  } catch {
    return 0;
  }
}

/** Compute earnings for a set of distinct referrers (parallel, de-duped). */
export async function earningsByReferrer(
  referrers: string[],
  solPrice: number
): Promise<Record<string, number>> {
  const distinct = Array.from(new Set(referrers.filter(Boolean)));
  const out: Record<string, number> = {};
  await Promise.all(
    distinct.map(async (r) => {
      out[r] = await referrerEarningsUsd(r, solPrice);
    })
  );
  return out;
}
