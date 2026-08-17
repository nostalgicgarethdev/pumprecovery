import { useCoins } from "@/hooks/useCoins";
import { useLocalStorage } from "usehooks-ts";
import { CoinPreview } from "./CoinPreview";
import { useState } from "react";

const LIMIT = 10;
export const CoinsCreated = ({ address }: { address: string }) => {
  const [includeNsfw] = useLocalStorage("include-nsfw", false);
  const [offset, setOffset] = useState(0);
  const { coins } = useCoins({
    sort: "created_timestamp",
    order: "desc",
    offset,
    limit: LIMIT,
    includeNsfw,
    creator: address,
  });

  return (
    <div className="max-w-[400px]">
      {coins.map((coin) => (
        <CoinPreview coin={coin} key={coin.mint} />
      ))}

      <div className="w-full flex justify-center mt-4">
        <div className="justify-self-end mb-20">
          <div className="flex justify-center space-x-2 text-slate-50">
            <button
              disabled={offset == 0}
              onClick={() => setOffset(offset - LIMIT)}
              className={`text-sm ${
                offset == 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
              }`}
            >
              {"[ << ]"}
            </button>
            <span>{Math.ceil(offset / LIMIT) + 1}</span>
            <button
              disabled={coins?.length % LIMIT !== 0}
              onClick={() => setOffset(offset + LIMIT)}
              className={`text-sm ${
                coins?.length % LIMIT !== 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
              }`}
            >
              {"[ >> ]"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
