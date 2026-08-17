"use client";

import { useLatestTrade } from "@/hooks/useLatestTrade";
import { TwitterUser } from "./TwitterUser";
import clsx from "clsx";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { BN } from "@coral-xyz/anchor";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useEffect, useState } from "react";
import { useTradeUpdates } from "@/hooks/useTradeUpdates";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { UserPreview } from "./UserPreview";

export const LatestTrade = () => {
  const [latestTrade, setLatestTrade] = useState<any | null | undefined>(null);
  const [isNewTrade, setIsNewTrade] = useState(false);

  const { latestTrade: newTradeUpdate } = useTradeUpdates();
  const { latestTrade: fetchedLatestTrade } = useLatestTrade();

  const { ipfsPrefix } = useIpfsPrefix();

  useEffect(() => {
    if (fetchedLatestTrade) {
      setLatestTrade(fetchedLatestTrade);
    }
  }, [fetchedLatestTrade]);

  useEffect(() => {
    if (newTradeUpdate) {
      setLatestTrade(newTradeUpdate);
      setIsNewTrade(true);
      setTimeout(() => setIsNewTrade(false), 700);
    }
  }, [newTradeUpdate]);

  if (!latestTrade) return null;

  const {
    is_buy,
    twitter_username,
    pfp,
    sol_amount,
    token_amount,
    timestamp,
    mint,
    symbol,
    image_uri,
    user,
    profile_image,
    username,
  } = latestTrade;

  const cleanImageUri = (image_uri || "").replace(
    "https://cf-ipfs.com/ipfs/",
    ipfsPrefix
  );

  return (
    <div
      className={clsx(
        "p-2 rounded flex items-center gap-1 text-sm",
        is_buy ? "bg-green-300" : "bg-red-300",
        isNewTrade && "animate-shake"
      )}
    >
      <UserPreview
        username={username}
        profile_image={profile_image}
        address={user}
      />
      {is_buy ? "bought" : "sold"}{" "}
      {lamportsToSol(new BN(sol_amount)).toFixed(4)} SOL of
      <Link className="hover:underline flex gap-2" href={`/${mint}`}>
        {symbol}
        <img src={cleanImageUri} className="h-5 w-5 rounded-full" />
      </Link>
    </div>
  );
};
