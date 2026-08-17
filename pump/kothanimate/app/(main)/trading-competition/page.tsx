"use client";

import { lamportsToSol } from "@/utils/lamportsToSol";
import { useEffect, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TwitterUser } from "@/components/TwitterUser";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLinkedX } from "@/providers/LinkedXProvider";

interface LeaderboardEntry {
  user: string;
  volume: BN;
  pnl: BN;
  daily_pnl: BN;
  twitter_username: string;
  pfp: string;
}

const LeaderboardRow = ({
  rank,
  user,
  volume,
  pnl,
  daily_pnl,
  twitter_username,
  pfp,
  isTopDailyPnl,
  isCurrentUser,
}: {
  rank: number;
  user: string;
  volume: BN;
  pnl: BN;
  daily_pnl: BN;
  twitter_username: string;
  pfp: string;
  isTopDailyPnl: boolean;
  isCurrentUser?: boolean;
}) => {
  let rowStyle = "bg-primary border border-[#2e303a]";
  let prize = "";

  if (rank === 1) {
    rowStyle = "bg-[#D9BE3B] text-[#f4e8b6] border border-[#C9B037]";
    prize = "1 Mafia Nut + 3 SOL";
  } else if (rank === 2) {
    rowStyle = "bg-[#B4B4B4] text-[#e6e6e6] border border-[#B4B4B4]";
    prize = "1 Mafia Nut";
  } else if (rank === 3) {
    rowStyle = "bg-[#AD8A56] text-[#f0d6a4] border border-[#AD8A56]";
    prize = "3K vNFTP + 3 SOL ";
  } else if (rank >= 4 && rank <= 10) {
    prize = "1K vNFTP + 1 SOL ";
  }

  return (
    <div
      className={`m-1 sm:m-2 ${
        isCurrentUser ? "bg-[#555865]" : "bg-[#2e303a]"
      } rounded-lg grid grid-cols-6 items-start`}
    >
      <div className="p-3 text-left">
        <div
          className={`w-8 h-8 flex items-center justify-center ${rowStyle} rounded-full`}
        >
          {rank}
        </div>
      </div>
      <div className="p-3 text-left flex items-center">
        <TwitterUser
          twitter_username={twitter_username}
          pfp={pfp}
          address={user}
        />
      </div>
      {/* <div className="p-3 text-right overflow-hidden whitespace-nowrap sm:block hidden">
        <span className="flex items-center justify-end">
          {Number(lamportsToSol(new BN(volume))).toFixed(4)}
          <img
            className="w-4 h-4 rounded-full ml-2"
            src="https://www.liblogo.com/img-logo/so2809s56c-solana-logo-solana-crypto-logo-png-file-png-all.png"
            alt="SOL"
          />
        </span>
      </div> */}
      <div className="p-3 text-right overflow-hidden whitespace-nowrap">
        <span className="flex items-center justify-end">
          {Number(lamportsToSol(new BN(pnl))).toFixed(4)}
          <img
            className="w-4 h-4 rounded-full ml-2"
            src="https://www.liblogo.com/img-logo/so2809s56c-solana-logo-solana-crypto-logo-png-file-png-all.png"
            alt="SOL"
          />
        </span>
      </div>
      <div className="p-3 text-right overflow-hidden whitespace-nowrap">
        <span className="flex items-center justify-end">
          {Number(lamportsToSol(new BN(daily_pnl))).toFixed(4)}
          <img
            className="w-4 h-4 rounded-full ml-2"
            src="https://www.liblogo.com/img-logo/so2809s56c-solana-logo-solana-crypto-logo-png-file-png-all.png"
            alt="SOL"
          />
        </span>
      </div>
      <div className="p-3 text-right flex items-center justify-end font-semibold">
        {prize}
      </div>
      <div className="p-3 text-right flex items-center justify-end font-semibold">
        {isTopDailyPnl ? "1 SOL" : ""}
      </div>
    </div>
  );
};

const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );

  const { publicKey } = useWallet();

  const topDailyPnlRank = leaderboardData.reduce((acc, curr, index) => {
    // Ensure that both current and accumulator daily_pnl values are BN objects
    const accDailyPnl = new BN(leaderboardData[acc].daily_pnl);
    const currDailyPnl = new BN(curr.daily_pnl);

    // Use the .gt() method to compare BN objects
    if (currDailyPnl.gt(accDailyPnl)) {
      return index; // If current daily_pnl is greater, return current index
    } else {
      return acc; // Otherwise, keep the accumulator index
    }
  }, 0);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/trading-competition`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setLeaderboardData(data);
      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
      }
    };

    fetchLeaderboardData();
  }, []);

  const userRank = leaderboardData.findIndex(
    (entry) => entry.user === publicKey?.toBase58()
  );

  const relevantEntries = [
    ...(userRank > 0 ? [leaderboardData[userRank - 1]] : []),
    ...(userRank !== -1 ? [leaderboardData[userRank]] : []),
    ...(userRank !== -1 && userRank < leaderboardData.length - 1
      ? [leaderboardData[userRank + 1]]
      : []),
  ];

  return (
    <div>
      <div className="flex justify-center mt-24">
        <Button
          variant="ghost"
          asChild
          className="-mt-5 text-2xl text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
        >
          <Link href="/board">[go back]</Link>
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center mt-16">
        <h1 className="text-2xl font-bold text-white mb-8">Current Position</h1>
        {publicKey && userRank !== -1 && (
          <div className="w-full sm:w-1/2 text-xs sm:text-sm text-gray-400 bg-transparent rounded-lg mb-8">
            <div className="m-1 sm:m-2 bg-[#2e303a] rounded-lg grid grid-cols-6">
              <div className="col-span-1 p-3 font-normal text-left">rank</div>
              <div className="col-span-1 p-3 font-normal text-left">
                account
              </div>
              {/* <div className="col-span-1 p-3 font-normal text-right sm:block hidden">
              total volume
            </div> */}
              <div className="col-span-1 p-3 font-normal text-right">
                total pnl
              </div>
              <div className="col-span-1 p-3 font-normal text-right">
                total daily pnl
              </div>
              <div className="col-span-1 p-3 font-normal text-right">
                final prize
              </div>
              <div className="col-span-1 p-3 font-normal text-right">
                daily prize
              </div>
            </div>
            {relevantEntries.map((data, index) => (
              <LeaderboardRow
                rank={userRank === 0 ? index + 1 : userRank + index}
                user={data.user}
                volume={data.volume}
                pnl={data.pnl}
                daily_pnl={data.daily_pnl}
                twitter_username={data.twitter_username}
                pfp={data.pfp}
                key={index}
                isTopDailyPnl={userRank + index === topDailyPnlRank}
                isCurrentUser={publicKey?.toBase58() === data.user}
              />
            ))}
          </div>
        )}
        <h1 className="text-2xl font-bold text-white mb-8">Leaderboard</h1>

        <div className="w-full sm:w-1/2 text-xs sm:text-sm text-gray-400 bg-transparent rounded-lg">
          <div className="m-1 sm:m-2 bg-[#2e303a] rounded-lg grid grid-cols-6">
            <div className="col-span-1 p-3 font-normal text-left">rank</div>
            <div className="col-span-1 p-3 font-normal text-left">account</div>
            {/* <div className="col-span-1 p-3 font-normal text-right sm:block hidden">
              total volume
            </div> */}
            <div className="col-span-1 p-3 font-normal text-right">
              total pnl
            </div>
            <div className="col-span-1 p-3 font-normal text-right">
              total daily pnl
            </div>
            <div className="col-span-1 p-3 font-normal text-right">
              final prize
            </div>
            <div className="col-span-1 p-3 font-normal text-right">
              daily prize
            </div>
          </div>

          {leaderboardData?.map((data, index) => (
            <LeaderboardRow
              rank={index + 1}
              user={data.user}
              volume={data.volume}
              pnl={data.pnl}
              daily_pnl={data.daily_pnl}
              twitter_username={data.twitter_username}
              pfp={data.pfp}
              key={index}
              isTopDailyPnl={index === topDailyPnlRank}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
