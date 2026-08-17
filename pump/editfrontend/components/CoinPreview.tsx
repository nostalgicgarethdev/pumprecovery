import Link from "next/link";
import { TwitterUser } from "./TwitterUser";
import { Badge } from "./Badge";
import { Coin } from "@/hooks/useCoins";
import { UserPreview } from "./UserPreview";

export const CoinPreview = ({
  coin,
  shouldAnimate,
}: {
  coin: Coin;
  shouldAnimate?: boolean;
}) => {
  const {
    name,
    symbol,
    description,
    image_uri,
    mint,
    creator,
    king_of_the_hill_timestamp,
    raydium_pool,
    reply_count,
    username,
    profile_image,
    creator_profile_image,
    creator_username,
  } = coin as any;

  return (
    <Link href={`/${mint}`}>
      <div
        className={`max-h-[300px] overflow-hidden h-fit p-2 flex border border-transparent hover:border-white gap-2 w-full ${
          shouldAnimate ? "animate-shake" : ""
        }`}
      >
        <div className="min-w-32">
          <img className="mr-4 w-32 h-auto" src={image_uri} alt={name} />
        </div>

        <div className="gap-1 grid h-fit">
          <div className="text-xs text-blue-200 flex items-center gap-2">
            <div>Created by</div>

            <UserPreview
              username={username || creator_username}
              profile_image={profile_image || creator_profile_image}
              address={creator}
            />
          </div>

          <p className="text-xs text-green-300 flex gap-1">
            {`market cap: ${Number(coin.usd_market_cap / 1000).toFixed(2)}K`}

            {(king_of_the_hill_timestamp || raydium_pool) && (
              <div className="flex text-green-500">
                [badge:{" "}
                {raydium_pool && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <Badge image={"/migrated.png"} alt="raydium badge" />
                  </div>
                )}
                {king_of_the_hill_timestamp && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <Badge image={"/king.png"} alt="king of the hill badge" />
                  </div>
                )}
                ]
              </div>
            )}
          </p>

          <p className="text-xs flex items-center gap-2">
            replies: {reply_count || 0}
            {coin.nsfw && <span className="text-red-400">[NSFW]</span>}
          </p>

          <p
            className="text-sm w-full"
            style={{
              overflowWrap: "break-word",
              wordBreak: "break-all",
            }}
          >
            <span className="font-bold">
              {name} (ticker: {symbol}):{" "}
            </span>
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
};
