"use client";

import { useState } from "react";

/**
 * Compact, tappable contract-address (mint) chip. Shows a shortened CA and
 * copies the full mint on click — surfaced on the coin page (esp. mobile) so
 * the CA is easy to find/copy.
 */
export function CopyCa({ mint, className }: { mint: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${mint.slice(0, 4)}…${mint.slice(-4)}`;

  const copy = async (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <button
      onClick={copy}
      title={`Copy CA: ${mint}`}
      className={
        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-gray-700 " +
        "bg-gray-800/60 text-gray-300 hover:text-white hover:border-gray-500 " +
        (className || "")
      }
    >
      <span className="text-gray-500">CA</span>
      <span className="font-mono">{short}</span>
      <span className={copied ? "text-green-300" : "text-gray-500"}>
        {copied ? "✓ copied" : "copy"}
      </span>
    </button>
  );
}
