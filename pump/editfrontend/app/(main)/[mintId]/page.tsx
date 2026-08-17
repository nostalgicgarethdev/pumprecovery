"use client";

import { useEffect, useState } from "react";
import Info from "@/components/Info";
import TradeBox from "@/components/TradeBox";
import Transactions from "@/components/Transactions";
import Chart from "@/components/Chart/Chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCoin } from "@/hooks/useCoin";
import { useBondingCurve } from "@/hooks/useBondingCurve";
import { useCandlesticks } from "@/hooks/useCandlesticks";
import { useTrades } from "@/hooks/useTrades";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { BN } from "@coral-xyz/anchor";
import clsx from "clsx";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { TwitterUser } from "@/components/TwitterUser";
import { Comments } from "@/components/Comments";
import { Thread } from "@/components/Thread";
import { useProfile } from "@/providers/ProfileProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { RaydiumTradeBox } from "@/components/RaydiumTradeBox";
import { UserPreview } from "@/components/UserPreview";
import { useSocket } from "@/providers/SocketProvider";

const LIMIT = 200;
export default function Trade({
  params: { mintId },
}: {
  params: { mintId: string };
}) {
  const socket = useSocket();
  const [showThread, setShowThread] = useState(true);
  const { coin, fetchCoin } = useCoin(mintId);
  const {
    getUSDMarketCap,
    bondingCurve,
    solPrice,
    getFinalVirtualSolReserves,
  } = useBondingCurve(coin);
  const [selectedTab, setSelectedTab] = useState("trade");
  const { candlesticks } = useCandlesticks(mintId);
  const { address, loginToken } = useProfile();
  const { isAdmin } = useIsAdmin(address);

  useEffect(() => {
    if (!coin) return;
    if (!socket) return;

    socket.emit("joinTradeRoom", { mint: coin.mint });

    return () => {
      socket.emit("leaveTradeRoom", { mint: coin.mint });
    };
  }, [coin?.mint, socket]);

  if (!coin) return null;

  const { creator, username, profile_image } = coin;

  const isWidthSmallerThanMd = () => {
    // Tailwind's 'md' breakpoint is usually set at 768px by default.
    const mdBreakpoint = 768;
    return window.innerWidth < mdBreakpoint;
  };

  const toggleNsfw = async (mint: string, nsfw: boolean) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/moderation/mark-as-nsfw/${mint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
        },
        body: JSON.stringify({ nsfw }),
      }
    );

    await fetchCoin(mint);
  };

  return (
    <>
      {!isWidthSmallerThanMd() && (
        <div className="md:block hidden mt-16 p-4">
          <div className="flex justify-center">
            <Button
              variant="ghost"
              asChild
              className="-mt-5 text-2xl text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
            >
              <Link href="/board">[go back]</Link>
            </Button>
          </div>

          {isAdmin && (
            <div className="flex gap-2 w-fit text-white">
              <button
                className="p-2 bg-red-400 rounded mr-2"
                onClick={() => toggleNsfw(mintId, true)}
              >
                Mark as NSFW
              </button>

              <button
                className="p-2 bg-blue-400 rounded"
                onClick={() => toggleNsfw(mintId, false)}
              >
                Mark as SFW
              </button>
            </div>
          )}

          {bondingCurve &&
            coin.complete &&
            (coin.raydium_pool ? (
              <div className="p-4 w-fit bg-green-300 rounded mt-4 mb-4">
                raydium pool seeded! view the coin on raydium{" "}
                <a
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://dexscreener.com/solana/${coin.raydium_pool}`}
                >
                  here
                </a>
              </div>
            ) : (
              <div className="p-4 w-fit bg-green-300 rounded mt-4 mb-4">
                bonding curve complete! a raydium pool will be seeded in the
                next 5-20 minutes with $
                {Math.floor(
                  lamportsToSol(getFinalVirtualSolReserves()) * solPrice
                ).toLocaleString()}{" "}
                of liquidity
              </div>
            ))}

          <div className="flex space-x-8 mt-4">
            <div className="flex flex-col gap-2 w-2/3">
              <div
                className={`text-xs text-green-300 flex w-full justify-between items-center`}
              >
                <div className="flex gap-4">
                  <div className="text-gray-400">{coin.name}</div>
                  <div className="text-gray-400">Ticker: {coin.symbol}</div>

                  <div>
                    Market cap: $
                    {coin.raydium_pool
                      ? coin.usd_market_cap
                        ? Number(
                            coin.usd_market_cap.toFixed(2)
                          ).toLocaleString()
                        : 0
                      : getUSDMarketCap()}
                  </div>

                  {bondingCurve && (
                    <div>
                      Virtual liquidity: $
                      {Number(
                        (
                          (bondingCurve.virtualSolReserves.toNumber() /
                            10 ** 9) *
                          solPrice *
                          2
                        ).toFixed(0)
                      ).toLocaleString()}
                    </div>
                  )}

                  {coin.nsfw && <div className="text-red-400">[NSFW]</div>}
                </div>

                <div className="inline-flex items-center gap-2 text-sm">
                  <span>created by</span>

                  <UserPreview
                    username={username}
                    profile_image={profile_image}
                    address={creator}
                    withBackground
                  />
                </div>
              </div>

              <div className="h-4/8">
                <Chart
                  height={400}
                  widthScale={0.99}
                  candlesticks={candlesticks}
                  symbol={coin.symbol}
                  coin={coin}
                />
              </div>

              <div className="flex gap-2 h-fit">
                <div
                  onClick={() => setShowThread(true)}
                  className={clsx(
                    "cursor-pointer px-1 rounded",
                    showThread && "bg-green-300 text-black",
                    !showThread && "hover:bg-gray-800 text-gray-500"
                  )}
                >
                  Thread
                </div>
                <div
                  onClick={() => setShowThread(false)}
                  className={clsx(
                    "cursor-pointer px-1 rounded",
                    !showThread && "bg-green-300 text-black",
                    showThread && "hover:bg-gray-800 text-gray-500"
                  )}
                >
                  Trades
                </div>
              </div>

              {showThread ? (
                <Thread coin={coin} />
              ) : (
                <Transactions coin={coin} />
              )}
            </div>

            <div className="w-1/3 grid gap-4 h-fit w-fit">
              {coin.raydium_pool ? (
                <RaydiumTradeBox coin={coin} />
              ) : (
                <TradeBox
                  showInput={!coin.complete}
                  coin={coin}
                  title="Dogecoin"
                  holders={[
                    {
                      image: "/placeholder.svg?height=40&width=40",
                      name: "ansem",
                    },
                    {
                      image: "/placeholder.svg?height=40&width=40",
                      name: "out.eth",
                    },
                  ]}
                  logo="/placeholder.svg?height=40&width=40"
                  description="much doge much wow, 1 doge = 1 doge. doge good. doge stronk."
                />
              )}

              {/* <Comments mintId={coin.mint} /> */}

              <Info coin={coin} />
            </div>
          </div>
        </div>
      )}

      <div
        className="md:hidden relative grid h-full pb-24"
        style={{ gridTemplateRows: "1fr auto" }}
      >
        {isAdmin && (
          <div className="flex gap-2 w-fit text-white">
            <button
              className="p-2 bg-red-400 rounded mr-2"
              onClick={() => toggleNsfw(mintId, true)}
            >
              Mark as NSFW
            </button>

            <button
              className="p-2 bg-blue-400 rounded"
              onClick={() => toggleNsfw(mintId, false)}
            >
              Mark as SFW
            </button>
          </div>
        )}

        <div className="h-full p-4 overflow-auto">
          {selectedTab === "info" && <Info coin={coin} />}
          {selectedTab === "chart" && (
            <div className="w-full h-full" id="chart">
              <Chart
                height={600}
                widthScale={0.95}
                candlesticks={candlesticks}
                symbol={coin.symbol}
                coin={coin}
              />
            </div>
          )}

          {selectedTab === "trade" && (
            <div className="grid gap-1">
              {bondingCurve &&
                coin.complete &&
                (coin.raydium_pool ? (
                  <div className="p-4 w-fit bg-green-300 rounded mb-4">
                    raydium pool seeded! view the coin on raydium{" "}
                    <a
                      className="text-blue-500 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://dexscreener.com/solana/${coin.raydium_pool}`}
                    >
                      here
                    </a>
                  </div>
                ) : (
                  <div className="p-4 w-fit bg-green-300 rounded mb-4">
                    bonding curve complete! a raydium pool will be seeded in the
                    next 5-20 minutes with $
                    {Math.floor(
                      lamportsToSol(getFinalVirtualSolReserves()) * solPrice
                    ).toLocaleString()}{" "}
                    of liquidity
                  </div>
                ))}

              <div className={`text-sm text-green-300 flex gap-2`}>
                Market cap: $
                {coin.raydium_pool
                  ? coin.usd_market_cap
                    ? Number(coin.usd_market_cap.toFixed(2)).toLocaleString()
                    : 0
                  : getUSDMarketCap()}
                {coin.nsfw && <div className="text-red-400">[NSFW]</div>}
              </div>

              {coin.raydium_pool ? (
                <RaydiumTradeBox coin={coin} />
              ) : (
                <TradeBox
                  showInput={!coin.complete}
                  coin={coin}
                  title="Dogecoin"
                  holders={[
                    {
                      image: "/placeholder.svg?height=40&width=40",
                      name: "ansem",
                    },
                    {
                      image: "/placeholder.svg?height=40&width=40",
                      name: "out.eth",
                    },
                  ]}
                  logo="/placeholder.svg?height=40&width=40"
                  description="much doge much wow, 1 doge = 1 doge. doge good. doge stronk."
                />
              )}

              <div className="flex gap-2">
                <div
                  onClick={() => setShowThread(true)}
                  className={clsx(
                    "cursor-pointer px-1 rounded",
                    showThread && "bg-green-300 text-black",
                    !showThread && "hover:bg-gray-800 text-gray-500"
                  )}
                >
                  Thread
                </div>
                <div
                  onClick={() => setShowThread(false)}
                  className={clsx(
                    "cursor-pointer px-1 rounded",
                    !showThread && "bg-green-300 text-black",
                    showThread && "hover:bg-gray-800 text-gray-500"
                  )}
                >
                  Wall of fame
                </div>
              </div>

              {showThread ? <Thread coin={coin} /> : null
              // <Comments mintId={coin.mint} />
              }
            </div>
          )}

          {selectedTab === "txs" && <Transactions coin={coin} />}
        </div>

        <div className="md:relative fixed bottom-0 z-10 w-full flex justify-around border-t-2 border-gray-200 py-4 bg-[#5c5f66]">
          {[
            { label: "[info]", key: "info" },
            { label: "[chart]", key: "chart" },
            { label: "[buy/sell]", key: "trade" },
            { label: "[txs]", key: "txs" },
          ].map(({ label, key }) => (
            <Button
              key={key}
              variant="ghost"
              onClick={() => setSelectedTab(key)}
              className={clsx(
                "text-black hover:bg-transparent hover:text-white",
                selectedTab === key && "font-bold text-white bg-transparent"
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
