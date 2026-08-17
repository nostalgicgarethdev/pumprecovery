"use client";

import { useEffect } from "react";

/**
 * Error boundary for the (main) route group. Without this, any render-time
 * throw on a page (e.g. a coin page) surfaces as Next's cryptic
 * "missing required error components, refreshing..." overlay. This renders a
 * friendly fallback with a retry instead.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto p-10 text-center text-white">
      <h2 className="text-lg font-bold">Something went wrong loading this page.</h2>
      <p className="text-sm text-gray-400 mt-2 break-words">
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-5 px-3 py-1.5 rounded bg-green-300 text-black text-sm font-bold hover:bg-green-200"
      >
        Try again
      </button>
    </div>
  );
}
