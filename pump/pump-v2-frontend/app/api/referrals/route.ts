import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Full referral graph (edge list) for the public /referrals tree.
 *
 * Reads every on-chain `referral_record` PDA (disc8 + user32 + referrer32 +
 * referrer2_32 + referrer3_32 = 136 bytes) for the pump program and emits
 * { a: user, p: tier-1 referrer (null if self/root), u: username }. Usernames
 * are joined from Supabase `users2`. Keys stay server-side; cached.
 */

export const revalidate = 180; // refresh the graph at most every 3 min
export const maxDuration = 30;

const PROGRAM_ID = process.env.NEXT_PUBLIC_PUMP_PROGRAM_ID as string;
const REFERRAL_RECORD_SIZE = 136;

export async function GET() {
  const rpc = process.env.NEXT_PUBLIC_SOLANA_API_URL;
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  if (!rpc || !PROGRAM_ID) {
    return Response.json({ error: "RPC / program id not configured" }, { status: 500 });
  }

  let nodes: { a: string; p: string | null; u: string | null }[] = [];
  try {
    const conn = new Connection(rpc, "confirmed");
    const accts = await conn.getProgramAccounts(new PublicKey(PROGRAM_ID), {
      filters: [{ dataSize: REFERRAL_RECORD_SIZE }],
    });

    // usernames (best-effort)
    const names = new Map<string, string>();
    if (sbUrl && sbKey) {
      try {
        const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };
        let offset = 0;
        for (;;) {
          const r = await fetch(
            `${sbUrl}/rest/v1/users2?select=address,username&limit=1000&offset=${offset}`,
            { headers, next: { revalidate } }
          );
          if (!r.ok) break;
          const batch: any[] = await r.json();
          for (const u of batch) if (u.username) names.set(u.address, u.username);
          if (batch.length < 1000) break;
          offset += 1000;
        }
      } catch {
        /* names are optional */
      }
    }

    const have = new Set<string>();
    for (const acc of accts) {
      const d = acc.account.data as Buffer;
      const user = new PublicKey(d.subarray(8, 40)).toBase58();
      const r1 = new PublicKey(d.subarray(40, 72)).toBase58();
      const parent = r1 === user ? null : r1;
      nodes.push({ a: user, p: parent, u: names.get(user) ?? null });
      have.add(user);
    }
    // include referrers that have no record of their own as root nodes
    for (const n of [...nodes]) {
      if (n.p && !have.has(n.p)) {
        have.add(n.p);
        nodes.push({ a: n.p, p: null, u: names.get(n.p) ?? null });
      }
    }
  } catch (e) {
    return Response.json({ error: `graph fetch failed: ${(e as Error).message}` }, { status: 502 });
  }

  return Response.json({
    generatedAt: new Date().toISOString(),
    count: nodes.length,
    nodes,
  });
}
