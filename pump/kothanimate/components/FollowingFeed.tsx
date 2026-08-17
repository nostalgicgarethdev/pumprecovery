import { useFollowingFeed } from "@/hooks/useFollowingFeed";
import { Trade } from "@/hooks/useTrades";
import Link from "next/link";
import { Oval } from "react-loader-spinner";
import { UserPreview } from "./UserPreview";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { BN } from "bn.js";
import clsx from "clsx";
import { Recommendations } from "./Recommendations";
import { useProfile } from "@/providers/ProfileProvider";

const TradeItem = ({ trade }: { trade: any }) => {
  const { ipfsPrefix } = useIpfsPrefix();

  const {
    mint,
    name,
    symbol,
    description,
    image_uri,
    username,
    profile_image,
    is_buy,
    sol_amount,
    user,
  } = trade;

  const cleanImageUri = image_uri.replace(
    "https://cf-ipfs.com/ipfs/",
    ipfsPrefix
  );

  return (
    <Link href={`/${mint}`}>
      <div
        className={`max-h-[300px] overflow-hidden h-fit p-2 flex border border-transparent hover:border-white gap-2 w-full text-gray-400`}
      >
        <div className="min-w-32">
          <img className="mr-4 w-32 h-auto" src={cleanImageUri} alt={name} />
        </div>

        <div className="gap-1 grid h-fit">
          <div
            className={clsx(
              "text-xs flex items-start w-fit flex-wrap",
              is_buy ? "text-green-300" : "text-red-300"
            )}
          >
            <UserPreview
              username={username}
              profile_image={profile_image}
              address={user}
            />

            <div>
              {is_buy ? "bought" : "sold"}{" "}
              {lamportsToSol(new BN(sol_amount)).toFixed(4)} SOL
            </div>
          </div>

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

export const FollowingFeed = () => {
  const { address } = useProfile();
  const { feed, loading } = useFollowingFeed();

  return (
    <div className="grid gap-4 text-white">
      {!feed.length && address && (
        <div>Follow some of your friends to start curating your feed</div>
      )}

      {address && <Recommendations address={address} />}

      {!address && <div>Connect your wallet to see a feed of your friends</div>}

      {loading ? (
        <div className="flex gap-2 text-white items-center">
          Loading... <Oval color="white" height={20} width={20} />
        </div>
      ) : (
        <div className="grid grid-col-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feed.map((v: any) => (
            <TradeItem trade={v} key={v.signature} />
          ))}
        </div>
      )}
    </div>
  );
};
