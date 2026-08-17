/**
 * DEX liquidity + 24h volume for a coin, via Birdeye (server-proxied so the API
 * key stays server-side, cached 60s).
 *
 * Uses Birdeye's AGGREGATE token_overview (liquidity, v24hUSD) as the source of
 * truth — the per-pool markets endpoint is noisy/flaky for tiny pools (it can
 * return 0 pools, and per-pool sums coincidentally matched TVL≈volume).
 */

export const revalidate = 60;

const BIRDEYE = "https://public-api.birdeye.so";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mint = searchParams.get("mint");
  if (!mint) return Response.json({ error: "mint required" }, { status: 400 });

  const key = process.env.BIRDEYE_API_KEY;
  // Mirror without the Birdeye key — degrade gracefully (200, not 500); the
  // consumer hides the widget instead of erroring.
  if (!key) return Response.json({ unavailable: true }, { status: 200 });

  const headers = { "X-API-KEY": key, "x-chain": "solana", accept: "application/json" };

  try {
    const ovRes = await fetch(`${BIRDEYE}/defi/token_overview?address=${mint}`, {
      headers,
      next: { revalidate },
    });
    if (!ovRes.ok) return Response.json({ error: `birdeye ${ovRes.status}` }, { status: 502 });
    const ov = (await ovRes.json())?.data ?? {};

    const tvl = Number(ov.liquidity) || 0;
    const vol = Number(ov.v24hUSD) || 0;

    return Response.json({
      tvl,
      vol,
      source: "birdeye:token_overview",
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
