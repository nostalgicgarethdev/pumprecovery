import { useIsClient } from "@uidotdev/usehooks";
import clsx from "clsx";

export const SelectedChain = () => {
  const isClient = useIsClient();

  if (!isClient) return null;

  const host = window.location.origin;

  return (
    <div className="text-white flex gap-2 items-center text-sm">
      <div>selected chain:</div>

      <a
        href={process.env.NEXT_PUBLIC_BLAST_FRONTEND_URL}
        // href={"https://base.pump.fun"}
        className={clsx(
          "cursor-pointer border p-1 rounded hover:border-white hover:opacity-100",
          host === process.env.NEXT_PUBLIC_BLAST_FRONTEND_URL
            ? "border-green-300 opacity-100"
            : "border-transparent opacity-50"
        )}
      >
        <img src="/blast.png" alt="blast" className="h-4" />
      </a>

      <a
        href={process.env.NEXT_PUBLIC_SOLANA_FRONTEND_URL}
        className={clsx(
          "cursor-pointer border p-1 rounded hover:border-white hover:opacity-100",
          host === process.env.NEXT_PUBLIC_SOLANA_FRONTEND_URL ||
            host === "https://pump.fun"
            ? "border-green-300 opacity-100"
            : "border-transparent opacity-50"
        )}
      >
        <img src="/solana.png" alt="solana" className="h-4" />
      </a>
    </div>
  );
};
