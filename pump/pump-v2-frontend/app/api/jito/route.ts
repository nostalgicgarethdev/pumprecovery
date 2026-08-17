export const dynamic = "force-dynamic";

// Server-side proxy for Jito so the browser doesn't hit CORS on
// bundles.jito.wtf / block-engine. Two actions:
//   GET  /api/jito?action=tipfloor  -> latest landed-tip percentiles
//   POST /api/jito  { bundle: string[] (base58 txs) } -> sendBundle
// We try multiple regional block-engine endpoints for resilience.

const BLOCK_ENGINES = [
  "https://mainnet.block-engine.jito.wtf",
  "https://amsterdam.mainnet.block-engine.jito.wtf",
  "https://frankfurt.mainnet.block-engine.jito.wtf",
  "https://ny.mainnet.block-engine.jito.wtf",
  "https://tokyo.mainnet.block-engine.jito.wtf",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "tipfloor";
  if (action === "tipaccounts") {
    try {
      const res = await fetch(`${BLOCK_ENGINES[0]}/api/v1/bundles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTipAccounts",
          params: [],
        }),
        signal: AbortSignal.timeout(6000),
      }).then((r) => r.json());
      return Response.json(res, { headers: CORS });
    } catch (e: any) {
      return Response.json(
        { error: e?.message || "getTipAccounts failed" },
        { status: 502, headers: CORS }
      );
    }
  }
  if (action !== "tipfloor") {
    return Response.json({ error: "unknown action" }, { status: 400, headers: CORS });
  }
  try {
    const res = await fetch("https://bundles.jito.wtf/api/v1/bundles/tip_floor", {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return Response.json(data, { headers: CORS });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "tip_floor failed" },
      { status: 502, headers: CORS }
    );
  }
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400, headers: CORS });
  }
  // Status lookup: { statuses: string[] (bundleIds) }
  if (Array.isArray(body?.statuses)) {
    for (const base of BLOCK_ENGINES) {
      try {
        const res = await fetch(`${base}/api/v1/getBundleStatuses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getBundleStatuses",
            params: [body.statuses],
          }),
          signal: AbortSignal.timeout(6000),
        }).then((r) => r.json());
        if (res?.result) return Response.json(res.result, { headers: CORS });
      } catch {
        /* try next region */
      }
    }
    return Response.json({ value: [] }, { headers: CORS });
  }

  const bundle: string[] = body?.bundle;
  if (!Array.isArray(bundle) || bundle.length === 0) {
    return Response.json(
      { error: "missing bundle: string[] (base58 txs)" },
      { status: 400, headers: CORS }
    );
  }

  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "sendBundle",
    params: [bundle],
  });

  const errors: string[] = [];
  // Fan out to several regions; return the first success (any region landing
  // the bundle is enough).
  for (const base of BLOCK_ENGINES) {
    try {
      const res = await fetch(`${base}/api/v1/bundles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      if (json?.result) {
        return Response.json({ result: json.result, region: base }, { headers: CORS });
      }
      errors.push(`${base} -> ${JSON.stringify(json?.error || json)}`);
    } catch (e: any) {
      errors.push(`${base} -> ${e?.message || e}`);
    }
  }
  return Response.json(
    { error: "all block engines failed", details: errors },
    { status: 502, headers: CORS }
  );
}
