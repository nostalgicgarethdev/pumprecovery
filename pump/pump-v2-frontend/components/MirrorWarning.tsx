"use client";

import { useEffect, useState } from "react";

/**
 * Loud, unmissable mirror-trust banner shown at the very top of every deploy.
 * The same open-source build runs on stacc.art and any mirror, so no visitor
 * should assume a given mirror is honest — shop around, use burners.
 *
 * SSR-safe: renders during prerender (so it shows immediately, no flash-in for
 * new visitors) and reads the dismissed flag from localStorage AFTER mount, so
 * it never calls a client-only hook during static export.
 */

const KEY = "mirror-warning-dismissed-v1";

const WARNING_TITLE = "Mirrors are untrusted — treat them like Piratebay mirrors";
const WARNING_BODY =
  "Trust these mirrors as much as you'd trust a given Piratebay mirror. Shop around, " +
  "use burner wallets, and never more than you can afford to lose. The code is " +
  "open-source and there's no assurance a dev hasn't nefariously changed some bits and bytes.";

export function MirrorWarning() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="w-full bg-red-950 border-b-2 border-red-500 text-red-100 text-xs sm:text-sm">
      <div className="max-w-5xl mx-auto px-3 py-2 flex items-start gap-3">
        <span className="text-red-400 font-bold shrink-0 text-base leading-none">⚠</span>
        <div className="flex-1 leading-snug">
          <span className="font-bold uppercase tracking-wide text-red-300">
            {WARNING_TITLE}.
          </span>{" "}
          {WARNING_BODY}{" "}
          <a
            href="https://stacc.show"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white whitespace-nowrap"
          >
            shop around ↗
          </a>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-red-300 hover:text-white px-2 font-bold"
          aria-label="dismiss warning"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
