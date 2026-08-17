export const dynamic = 'force-dynamic';

const GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

function extractHash(input: string): string | null {
  if (!input) return null;
  // Handle ipfs://<cid> or ipfs://ipfs/<cid>
  let s = input.trim();
  s = s.replace(/^ipfs:\/\//i, '');
  if (s.includes('/ipfs/')) {
    s = s.split('/ipfs/')[1];
  }
  // Strip any query or trailing path segments after the CID
  s = s.split(/[?#/]/)[0];
  // Basic CID sanity (Qm... or bafy...)
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{50,}|bafk[a-z2-7]{50,}|bafybei[a-z2-7]+)$/.test(s)) {
    return s;
  }
  // Fallback: take last plausible segment
  const parts = input.split('/');
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{50,})/.test(p)) return p;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUri = searchParams.get('uri') || searchParams.get('cid') || searchParams.get('hash') || searchParams.get('url');

  if (!rawUri) {
    return Response.json({ error: 'Missing ?uri= or ?cid=' }, { status: 400 });
  }

  const hash = extractHash(rawUri);
  if (!hash) {
    return Response.json({ error: 'Could not parse IPFS hash from uri', input: rawUri }, { status: 400 });
  }

  const errors: string[] = [];

  for (const base of GATEWAYS) {
    const url = `${base}${hash}`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'pump-ipfs-proxy/1',
          'Accept': '*/*',
        },
        redirect: 'follow',
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        const buf = await res.arrayBuffer();

        return new Response(buf, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
            'X-IPFS-Gateway': base,
            'X-IPFS-Hash': hash,
          },
        });
      } else {
        errors.push(`${base} -> ${res.status}`);
      }
    } catch (e: any) {
      errors.push(`${base} -> ${e?.message || e}`);
    }
  }

  return Response.json(
    {
      error: 'All IPFS gateways failed',
      hash,
      tried: GATEWAYS.map((g) => g + hash),
      details: errors,
    },
    { status: 502 }
  );
}
