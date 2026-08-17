"use client";

import Image from "next/image";
import Link from "next/link";
import { HowItWorks } from "./HowItWorks";
import { useIsClient } from "@uidotdev/usehooks";
import { Wallet } from "./Wallet";
import { LatestTrade } from "./LatestTrade";
import { WalleWithoutAuth } from "./WalletWithoutAuth";
import { LatestCoin } from "./LatestCoin";
import { SelectedChain } from "./SelectedChain";
import clsx from "clsx";
import { useProfile } from "@/providers/ProfileProvider";

const NavBar = ({ children }: { children: React.ReactNode }) => {
  const isClient = useIsClient();
  const { address, user } = useProfile();

  return (
    <div
      style={{
        display: "grid",
        height: "100vh",
        gridTemplateRows: "auto auto auto 1fr",
        alignItems: "start",
      }}
    >
      {/* <div className="border p-2 border-green-400 text-green-400">
          Charts and trades are currently being updated -- site might be affected for the next ~20 minutes.
        </div> */}

      <nav className="flex flex-wrap justify-between w-full p-2 items-start h-fit">
        <div className="flex gap-2 items-center">
          <Link href="/board">
            <Image
              src="/logo.png"
              alt="Pump"
              width={25}
              height={25}
              className="mr-4"
            />
          </Link>

          <div className="grid h-fit">
            <div className="flex gap-2">
              <a
                className="text-sm text-white hover:underline hover:font-bold"
                href="https://twitter.com/pumpdotfun"
                target="_blank"
                rel="noopener noreferrer"
              >
                [twitter]
              </a>

              <a
                className="text-sm text-white hover:underline hover:font-bold"
                href="https://t.me/pumpfunsupport"
                target="_blank"
                rel="noopener noreferrer"
              >
                [support]
              </a>
            </div>

            <div className="flex gap-2">
              <a
                className="text-sm text-white hover:underline hover:font-bold"
                href="https://t.me/launchonpump"
                target="_blank"
                rel="noopener noreferrer"
              >
                [telegram]
              </a>

              {isClient && <HowItWorks />}
            </div>
          </div>

          <div className="hidden md:flex gap-2">
            <LatestTrade />
            <div className="hidden lg:block">
              <LatestCoin />
            </div>
          </div>
        </div>

        <div className="md:flex md:gap-2 grid gap-1">
          <div className="grid justify-items-end">
            {/* <Link
              href="/trading-competition"
              className="text-sm text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
            >
              [trading leaderboard]
            </Link> */}

            {isClient && <Wallet />}
            {address && (
              <Link
                href={`/profile/${user?.username || address}`}
                className="text-white text-sm hover:underline relative"
              >
                [view profile]
                {Boolean(user?.unread_notifs_count) && (
                  <div className="text-white bg-red-500 px-1 rounded-full w-fit absolute top-[-6px] right-[-6px] text-xs">
                    {user?.unread_notifs_count}
                  </div>
                )}
              </Link>
            )}
          </div>

          {/* {isClient && <WalleWithoutAuth />} */}
        </div>
      </nav>

      <div className="md:hidden justify-self-center p-2 w-fit">
        <LatestTrade />
      </div>

      {/* <div className={"justify-self-center"}>
        <SelectedChain />
      </div> */}

      {/* <div className="bg-orange-700 p-1 justify-self-center rounded text-white m-4 text-center">
        Solana is facing congestion issues; This will affect how long it takes
        for your transactions to submit and the speed of raydium migrations.
        View more info{" "}
        <a
          href="https://twitter.com/0xMert_/status/1776023674098754014"
          className="text-blue-200 hover:underline"
        >
          here
        </a>
      </div> */}

      <main className="h-full">{children}</main>

      {/* <Chatbox /> */}
    </div>
  );
};

export default NavBar;
