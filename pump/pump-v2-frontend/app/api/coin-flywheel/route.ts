/**
 * Per-coin flywheel stats: referrers earned + $Pump ICO burned for ONE coin.
 *
 * Both are estimated as 1/3 of the coin's fees (fees = volume × 1%) — the design
 * splits every fee into 1/3 referrers · 1/3 LP · 1/3 buy&burn. Exact per-coin
 * attribution would require indexing the referral transfers + burn amounts per
 * bundle; this is the honest volume-derived estimate (labeled "est." in the UI).
 *
 * Supabase + Birdeye stay server-side; cached.
 */

export const revalidate = 120;

const HOUSE_MINT = "Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump";
const FEE_BPS = 100; // 1%
const LAMPORTS_PER_SOL = 1e9;
const BIRDEYE = "https://public-api.birdeye.so";

async function sumCoinVolumeLamports(base: string, key: string, mint: string) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let total = 0;
  let offset = 0;
  let sawLamports = false;
  for (;;) {
    const r = await fetch(
      `${base}/rest/v1/trades?mint=eq.${mint}&select=sol_amount&limit=1000&offset=${offset}`,
      { headers, next: { revalidate } }
    );
    if (!r.ok) break;
    const batch: any[] = await r.json();
    for (const t of batch) {
      const v = Number(t.sol_amount) || 0;
      if (v > 1e6) sawLamports = true;
      total += v;
    }
    if (batch.length < 1000) break;
    offset += 1000;
  }
  return sawLamports ? total / LAMPORTS_PER_SOL : total;
}

async function housePriceUsd(key: string) {
  try {
    const r = await fetch(`${BIRDEYE}/defi/token_overview?address=${HOUSE_MINT}`, {
      headers: { "X-API-KEY": key, "x-chain": "solana", accept: "application/json" },
      next: { revalidate },
    });
    if (!r.ok) return 0;
    return Number((await r.json())?.data?.price) || 0;
  } catch {
    return 0;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mint = searchParams.get("mint");
  if (!mint) return Response.json({ error: "mint required" }, { status: 400 });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  const beKey = process.env.BIRDEYE_API_KEY;
  if (!sbUrl || !sbKey || !beKey) {
    // Mirror without the server-side stats secrets — degrade gracefully (200,
    // not a 500): the consumer hides this widget instead of erroring.
    return Response.json({ unavailable: true }, { status: 200 });
  }

  let volSol = 0;
  try {
    volSol = await sumCoinVolumeLamports(sbUrl, sbKey, mint);
  } catch (e) {
    return Response.json({ error: `supabase: ${(e as Error).message}` }, { status: 502 });
  }

  let solPrice = 0;
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/sol-price`, {
      next: { revalidate },
    });
    if (r.ok) solPrice = Number((await r.json()).solPrice) || 0;
  } catch {
    /* leave 0 */
  }

  const housePrice = await housePriceUsd(beKey);

  const feesSol = volSol * (FEE_BPS / 10000);
  const refIncomeSol = feesSol / 3;
  const burnSol = feesSol / 3;
  const refIncomeUsd = refIncomeSol * solPrice;
  const burnUsd = burnSol * solPrice;
  const burnTokens = housePrice > 0 ? burnUsd / housePrice : 0;

  return Response.json({
    volSol,
    refIncomeSol,
    refIncomeUsd,
    burnUsd,
    burnTokens,
    housePrice,
    solPrice,
    updatedAt: new Date().toISOString(),
  });
}
