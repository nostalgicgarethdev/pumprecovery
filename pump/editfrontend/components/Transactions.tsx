"use client";

import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { Trade, useTrades } from "@/hooks/useTrades";
import { humanizeTokenAmount } from "@/utils/humanizeTokenAmount";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { BN } from "@coral-xyz/anchor";
import Link from "next/link";
import { TwitterUser } from "./TwitterUser";
import io from "socket.io-client";
import { useEffect, useState } from "react";
import { Coin } from "@/hooks/useCoins";
import { useTradeUpdates } from "@/hooks/useTradeUpdates";
import { isMobile } from "react-device-detect";
import { RiLoopRightLine } from "react-icons/ri";
import { useSocket } from "@/providers/SocketProvider";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { getPastelColor } from "@/utils/getPastelColor";
import { UserPreview } from "./UserPreview";

interface TxProps {
  coin: Coin;
  initialTrades?: Trade[];
}

const rankColors: { [key: string]: string } = {
  who_are_you: "lightgreen",
  "10cent_whale": "lightblue",
  accumulator: "lightyellow",
  chart_shark: "lightcoral",
  baron_von_pump: "plum",
};

interface TradeRowProps {
  trade: Trade;
  animate: boolean;
  formatDate: (timestamp: number) => string;
  devAddress: string;
}

const formatTokenAmount = (amount: string) => {
  const num = parseFloat(amount);
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + "b";
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + "m";
  } else if (num >= 1e4) {
    return (num / 1e3).toFixed(2) + "k";
  } else if (num >= 1) {
    return num.toFixed(2);
  }
  return num.toString();
};

const formatSolAmount = (amount: number) => {
  if (amount < 0.0001) {
    return amount.toExponential(2);
  } else {
    return amount.toFixed(4);
  }
};

const TradeRow = ({
  trade,
  animate,
  formatDate,
  devAddress,
}: TradeRowProps) => {
  const {
    signature,
    sol_amount,
    token_amount,
    is_buy,
    user,
    timestamp,
    mint,
    value,
    username,
    profile_image,
  } = trade;

  const animationClass = animate ? "animate-shake" : "";
  const buySellClass = is_buy ? "text-green-300" : "text-red-300";
  const buySellText = is_buy ? "buy" : "sell";

  const rankColor = rankColors[value || "who_are_you"] || "text-gray-400";

  const color = getPastelColor(user.slice(0, 6));

  return (
    <div
      className={`text-xs my-1 bg-[#2e303a] rounded-lg grid grid-cols-4 sm:grid-cols-6 items-start ${animationClass}`}
    >
      <div
        className="py-3 pl-2 text-left flex items-center flex-wrap"
        style={{ wordBreak: "break-all" }}
      >
        <UserPreview
          username={username}
          profile_image={profile_image}
          address={user}
          withBackground
        />
      </div>

      <div className={`p-3 text-left ${buySellClass} hidden sm:block`}>
        {is_buy ? "buy" : "sell"}
      </div>

      <div
        className={`p-3 text-left sm:flex sm:items-center sm:hidden ${buySellClass}`}
      >
        <span>{`${buySellText}  ${formatDate(timestamp).slice(0, -4)}`}</span>
      </div>

      <div className="p-3 text-left overflow-hidden whitespace-nowrap">
        {formatSolAmount(lamportsToSol(new BN(sol_amount)))}
      </div>

      <div className="p-3 text-left overflow-hidden whitespace-nowrap">
        {formatTokenAmount(humanizeTokenAmount(token_amount).toString())}
      </div>

      <div className="p-3 text-left hidden md:block">
        {formatDate(timestamp)}
      </div>

      <a
        href={`https://solscan.io/tx/${signature}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:block text-right p-3 hover:text-blue-500 hover:underline"
      >
        {signature.slice(0, 6)}
      </a>
    </div>
  );
};

const LIMIT = 200;
export default function Transactions({ coin }: TxProps) {
  const [offset, setOffset] = useState(0);
  const { trades: initialTrades } = useTrades({
    mint: coin.mint,
    limit: LIMIT,
    offset,
  });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [animatedTrades, setAnimatedTrades] = useState<string[]>([]);
  const [useRelativeDateFormat, setUseRelativeDateFormat] = useState(true);
  const [latestTrade, setLatestTrade] = useState<Trade | null>(null);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleTradeCreated = (newTrade: any) => {
      setLatestTrade(newTrade);
    };

    socket.on(`tradeCreated:${coin.mint}`, handleTradeCreated);

    return () => {
      socket.off(`tradeCreated:${coin.mint}`, handleTradeCreated);
    };
  }, [socket]);

  useEffect(() => {
    if (initialTrades) {
      setTrades(initialTrades);
    }
  }, [initialTrades]);

  useEffect(() => {
    if (latestTrade) {
      if (coin.mint === latestTrade.mint) {
        setTrades((prevTrades) => [latestTrade, ...prevTrades]);
        setAnimatedTrades([latestTrade.signature]);
        setTimeout(() => {
          setAnimatedTrades([]);
        }, 500);
      }
    }
  }, [latestTrade]);

  const formatDate = (timestamp: number) => {
    if (useRelativeDateFormat || isMobile) {
      const now = Date.now();
      const date = new Date(timestamp * 1000);
      const diffInSeconds = Math.max(
        1,
        Math.floor((now - date.getTime()) / 1000)
      );

      const minutes = Math.floor(diffInSeconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days}d ago`;
      } else if (hours > 0) {
        return `${hours}h ago`;
      } else if (minutes > 0) {
        return `${minutes}m ago`;
      } else {
        return `${diffInSeconds}s ago`;
      }
    } else {
      const date = new Date(timestamp * 1000);
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      const ampm = hours >= 12 ? "pm" : "am";
      const formattedHours = hours % 12 || 12;
      const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
      return `${month} ${day} ${formattedHours}:${paddedMinutes}:${paddedSeconds} ${ampm}`;
    }
  };

  return (
    <div className="w-full text-xs sm:text-sm text-gray-400 bg-transparent rounded-lg">
      <div className="bg-[#2e303a] rounded-lg grid grid-cols-4 sm:grid-cols-6">
        <div className="col-span-1 p-3 font-normal text-left">account</div>
        <div className="col-span-1 p-3 font-normal text-left hidden sm:block">
          type
        </div>
        <div className="col-span-1 p-3 font-normal text-left sm:hidden">
          txn
        </div>
        <div className="col-span-1 p-3 font-normal text-left">SOL</div>
        <div className="col-span-1 p-3 font-normal text-left">
          {coin.symbol}
        </div>
        <div className="col-span-1 p-3 font-normal text-left hidden md:block">
          <div className="flex items-center">
            date{" "}
            <span
              className="ml-1 inline-block align-middle hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                setUseRelativeDateFormat(!useRelativeDateFormat);
              }}
            >
              <RiLoopRightLine
                style={{ position: "relative", top: "1px" }}
                className="cursor-pointer"
              />
            </span>
          </div>
        </div>
        <div className="col-span-1 p-3 font-normal text-right hidden sm:block">
          transaction
        </div>
      </div>

      {trades?.map((trade, index) => (
        <TradeRow
          trade={trade}
          animate={animatedTrades.includes(trade.signature)}
          key={index}
          formatDate={formatDate}
          devAddress={coin.creator}
        />
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
              disabled={initialTrades?.length % LIMIT !== 0}
              onClick={() => setOffset(offset + LIMIT)}
              className={`text-sm ${
                initialTrades?.length % LIMIT !== 0 ||
                initialTrades?.length == 0
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
}
