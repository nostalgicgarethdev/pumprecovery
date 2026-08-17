import { useKingOfTheHill } from "@/hooks/useKingOfTheHill";
import Link from "next/link";
import { TwitterUser } from "./TwitterUser";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { Badge } from "./Badge";
import { UserPreview } from "./UserPreview";

export const KingOfTheHill = () => {
  const { king, loading } = useKingOfTheHill();
  const { ipfsPrefix } = useIpfsPrefix();

  if (!king) return;

  const {
    name,
    symbol,
    description,
    image_uri,
    pfp,
    mint,
    twitter_username,
    sortValue,
    creator,
    show_name,
    usd_market_cap,
    king_of_the_hill_timestamp,
    raydium_pool,
    reply_count,
    nsfw,
    profile_image,
    username,
  } = king;

  const cleanImageUri = (image_uri || "").replace(
    "https://cf-ipfs.com/ipfs/",
    ipfsPrefix
  );

  return (
    <div className="text-white max-w-[800px] grid gap-2">
      <img
        src="/king-of-the-hill.png"
        alt="king of the hill"
        className="h-8 justify-self-center"
      />

      <Link href={`/${mint}`}>
        <div className="p-2 flex border border-transparent hover:border-white gap-2 w-full max-h-[300px] overflow-hidden">
          <div className="min-w-20">
            <img className="mr-4 w-20 h-auto" src={cleanImageUri} alt={name} />
          </div>

          <div className="gap-1 grid h-fit">
            <div className="text-xs text-blue-200 flex items-center gap-2">
              <div>Created by</div>
              <UserPreview
                username={username}
                profile_image={profile_image}
                address={creator}
              />
            </div>

            {Boolean(usd_market_cap) && (
              <p className="text-xs text-green-300 flex gap-1">
                {`market cap: ${Number(usd_market_cap / 1000).toFixed(2)}K`}

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
                        <Badge
                          image={"/king.png"}
                          alt="king of the hill badge"
                        />
                      </div>
                    )}
                    ]
                  </div>
                )}
              </p>
            )}

            <p className="text-xs flex items-center gap-2">
              replies: {reply_count || 0}
              {nsfw && <span className="text-red-400">[NSFW]</span>}
            </p>

            <p className="text-sm w-full font-bold">
              {name} [ticker: {symbol}]
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};
