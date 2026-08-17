import { NextRequest, NextResponse } from "next/server";
import { pickHealthyMirror } from "@/lib/mirrors";

// Edge for fast failover redirects; always recompute (no caching the choice, or
// a dead mirror would get "stuck" as the cached target).
export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Catch-all redirector. Any path other than "/" (handled by the index page)
 * 302-forwards to the first healthy mirror, preserving the path + query so
 * deep links and ?ref= survive: stacc.show/<mint>?ref=X -> mirror/<mint>?ref=X
 */
async function redirect(req: NextRequest) {
  const url = new URL(req.url);
  const target = await pickHealthyMirror();
  // No live (non-blocklisted) mirror — send to the index so the visitor sees the
  // list + warning, rather than the blocklisted canonical.
  const dest = target
    ? new URL(url.pathname + url.search, target).toString()
    : new URL("/", url.origin).toString();
  const res = NextResponse.redirect(dest, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const GET = redirect;
export const HEAD = redirect;
