"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coin, useCoins } from "@/hooks/useCoins";
import { TwitterUser } from "@/components/TwitterUser";
import { Input } from "@/components/ui/input";
import { KingOfTheHill } from "@/components/KingOfTheHill";
import { useTradeUpdates } from "@/hooks/useTradeUpdates";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { useLocalStorage } from "usehooks-ts";
import clsx from "clsx";
import { Badge } from "@/components/Badge";
import { CoinPreview } from "@/components/CoinPreview";

const LIMIT = 50;
export default function Discover() {
  const [sort, setSort] = useState("last_trade_timestamp");
  const [order, setOrder] = useState("DESC");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [offset, setOffset] = useState(0);
  const [includeNsfw, setIncludeNsfw] = useLocalStorage("include-nsfw", false);
  const { coins, setCoins } = useCoins({
    sort,
    order,
    offset,
    limit: LIMIT,
    searchTerm,
    includeNsfw,
  });
  const { latestTrade } = useTradeUpdates();
  const lastProcessedTrade = useRef(null);
  const [lastUpdatedMint, setLastUpdatedMint] = useState<string | null>(null);
  const { ipfsPrefix } = useIpfsPrefix();
  const [showAnimations, setShowAnimations] = useLocalStorage(
    "show-animations",
    true
  );

  // useEffect(() => {
  //   const recordVisit = async () => {
  //     try {
  //       await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/visit`, {
  //         method: "POST",
  //         credentials: "include",
  //       });
  //     } catch (error) {
  //       console.error("Failed to record visit:", error);
  //     }
  //   };

  //   recordVisit();
  // }, []);

  useEffect(() => {
    if (
      sort === "last_trade_timestamp" &&
      latestTrade &&
      lastProcessedTrade.current !== latestTrade &&
      (!latestTrade.nsfw || (includeNsfw && latestTrade.nsfw)) &&
      offset === 0 &&
      order === "DESC" &&
      showAnimations
    ) {
      const matchesSearch =
        searchTerm === "" ||
        latestTrade.name.includes(searchTerm) ||
        latestTrade.symbol.includes(searchTerm) ||
        latestTrade.mint.includes(searchTerm);

      if (!matchesSearch) {
        return;
      }

      const coinIndex = coins.findIndex(
        (coin) => coin.mint === latestTrade.mint
      );
      let updatedCoins = [...coins];
      if (coinIndex !== -1) {
        const [updatedCoin] = updatedCoins.splice(coinIndex, 1);
        if (order === "DESC") {
          updatedCoins.unshift(updatedCoin);
        } else {
          updatedCoins.push(updatedCoin);
        }
      } else {
        const newCoin: any = {
          name: latestTrade.name,
          symbol: latestTrade.symbol,
          description: latestTrade.description,
          image_uri: latestTrade.image_uri?.replace(
            "https://cf-ipfs.com/ipfs/",
            ipfsPrefix
          ),
          pfp: latestTrade.CreatorPfp,
          creator: latestTrade.creator,
          creator_username: latestTrade.creator_username,
          creator_profile_image: latestTrade.creator_profile_image,
          mint: latestTrade.mint,
          twitter_username: latestTrade.CreatorTwitterUsername,
          sortValue: "last_trade_timestamp",
          show_name: latestTrade.showName,
          metadata_uri: latestTrade.metadataUri,
          bonding_curve: latestTrade.bondingCurve,
          associated_bonding_curve: latestTrade.associatedBondingCurve,
          created_timestamp: latestTrade.createdTimestamp,
          raydium_pool: latestTrade.raydium_pool,
          complete: latestTrade.complete,
          hidden: latestTrade.hidden,
          virtual_sol_reserves: latestTrade.virtualSolReserves,
          virtual_token_reserves: latestTrade.virtualTokenReserves,
          total_supply: latestTrade.totalSupply,
          market_cap: latestTrade.market_cap,
          usd_market_cap: latestTrade.usd_market_cap,
          king_of_the_hill_timestamp: latestTrade.king_of_the_hill_timestamp,
          reply_count: latestTrade.reply_count,
          nsfw: latestTrade.nsfw,
          inverted: latestTrade.inverted,
          market_id: latestTrade.market_id,
        };

        updatedCoins.unshift(newCoin);
      }
      if (updatedCoins.length > 50) {
        if (order === "DESC") {
          updatedCoins.pop();
        } else {
          updatedCoins.shift();
        }
      }
      setCoins(updatedCoins);
      setLastUpdatedMint(latestTrade.mint);
      lastProcessedTrade.current = latestTrade;
      setTimeout(() => setLastUpdatedMint(""), 700);
    }
  }, [latestTrade, sort, order, searchTerm, page, showAnimations]);

  return (
    <div className="grid h-screen md:gap-12 gap-4">
      <div className="flex flex-col items-center w-full mt-8">
        <Button
          variant="ghost"
          asChild
          className="mb-4 text-2xl text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
        >
          <Link href="/create">[start a new coin]</Link>
        </Button>

        <KingOfTheHill />
      </div>

      <div className="w-full grid justify-items-center px-2 sm:p-0">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="search for token"
          className="p-2 border border-gray-300 w-full max-w-[470px] bg-green-300 text-black border-none focus:border-none active:border-none"
        />
      </div>

      <div className="grid gap-6 md:gap-12 md:px-12 px-2">
        <div className="grid sm:flex gap-4 w-full items-center">
          <div className="flex gap-4">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger
                aria-label="Sort"
                className="bg-green-300 text-black border-none focus:border-none active:border-none"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="bg-green-300">
                <SelectItem value="last_trade_timestamp">
                  sort: bump order
                </SelectItem>
                <SelectItem value="last_reply">sort: last reply</SelectItem>
                <SelectItem value="reply_count">sort: reply count</SelectItem>
                <SelectItem value="market_cap">sort: market cap</SelectItem>
                <SelectItem value="created_timestamp">
                  sort: creation time
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={order} onValueChange={setOrder}>
              <SelectTrigger
                aria-label="Order"
                className="bg-green-300 text-black border-none focus:border-none active:border-none"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="bg-green-300">
                <SelectItem value="ASC">order: asc</SelectItem>
                <SelectItem value="DESC">order: desc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-1 h-fit items-center text-white">
            <div>Show animations:</div>
            <div
              onClick={() => setShowAnimations(true)}
              className={clsx(
                "cursor-pointer px-1 rounded",
                showAnimations && "bg-green-300 text-black",
                !showAnimations && "hover:bg-gray-800 text-gray-500"
              )}
            >
              On
            </div>
            <div
              onClick={() => setShowAnimations(false)}
              className={clsx(
                "cursor-pointer px-1 rounded",
                !showAnimations && "bg-green-300 text-black",
                showAnimations && "hover:bg-gray-800 text-gray-500"
              )}
            >
              Off
            </div>
          </div>

          <div className="flex gap-1 h-fit items-center text-white">
            <div>Include nsfw:</div>
            <div
              onClick={() => setIncludeNsfw(true)}
              className={clsx(
                "cursor-pointer px-1 rounded",
                includeNsfw && "bg-green-300 text-black",
                !includeNsfw && "hover:bg-gray-800 text-gray-500"
              )}
            >
              On
            </div>
            <div
              onClick={() => setIncludeNsfw(false)}
              className={clsx(
                "cursor-pointer px-1 rounded",
                !includeNsfw && "bg-green-300 text-black",
                includeNsfw && "hover:bg-gray-800 text-gray-500"
              )}
            >
              Off
            </div>
          </div>
        </div>

        <div className="grid grid-col-1 md:grid-cols-2 lg:grid-cols-3 text-gray-400 gap-4">
          {coins.map((coin) => (
            <CoinPreview
              coin={coin}
              key={coin.mint}
              shouldAnimate={coin.mint === lastUpdatedMint}
            />
          ))}
        </div>

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
    </div>
  );
}
