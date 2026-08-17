"use client";

import Image from "next/image";
import Link from "next/link";
import { HowItWorks } from "./HowItWorks";
import { WhyNotPump } from "./WhyNotPump";
import { ReferralLink } from "./ReferralLink";
import { useIsClient } from "@uidotdev/usehooks";
import { Wallet } from "./Wallet";
import { LatestTrade } from "./LatestTrade";
import { WalleWithoutAuth } from "./WalletWithoutAuth";
import { LatestCoin } from "./LatestCoin";
import clsx from "clsx";
import { useProfile } from "@/providers/ProfileProvider";
import { useBrand } from "@/lib/useBrand";
import { MirrorWarning } from "./MirrorWarning";
import { MirrorPing } from "./MirrorPing";

const NavBar = ({ children }: { children: React.ReactNode }) => {
  const isClient = useIsClient();
  const { address, user } = useProfile();
  const brand = useBrand();

  return (
    <div className="flex flex-col min-h-screen">
      <MirrorPing />
      <MirrorWarning />
      {/* <div className="border p-2 border-green-400 text-green-400">
          Charts and trades are currently being updated -- site might be affected for the next ~20 minutes.
        </div> */}

      <nav className="flex flex-wrap justify-between w-full p-2 items-start h-fit">
        <div className="flex gap-2 items-center">
          <Link href="/board">
            <Image
              src="/logo.png"
              alt={brand}
              width={25}
              height={25}
              className="mr-4"
            />
          </Link>

          <div className="grid h-fit">
            <div className="flex gap-2">
              <a
                className="text-sm text-white hover:underline hover:font-bold"
                href="https://twitter.com/staccoverflow"
                target="_blank"
                rel="noopener noreferrer"
              >
                [twitter]
              </a>
            </div>

            <div className="flex gap-2">
              <a
                className="text-sm text-white hover:underline hover:font-bold"
                href="https://github.com/staccDOTsol/pumprecovery"
                target="_blank"
                rel="noopener noreferrer"
              >
                [github]
              </a>

              <Link
                href="/airdrop"
                className="text-sm text-green-300 hover:font-bold hover:text-green-200"
              >
                [airdrop]
              </Link>

              <Link
                href="/referrals"
                className="text-sm text-green-300 hover:font-bold hover:text-green-200"
              >
                [ref tree]
              </Link>

              {isClient && <WhyNotPump />}
              {isClient && <HowItWorks />}
              {isClient && <ReferralLink />}
            </div>
          </div>

          {/* CA in header/nav */}
          <a
            className="text-xs text-yellow-400 hover:underline ml-2 hidden md:inline"
            href="https://pump.fun/coin/Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump"
            target="_blank"
            rel="noopener noreferrer"
          >
            CA: Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump
          </a>

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



      <main className="flex-1">{children}</main>

      {/* Disclaimer + GitHub at bottom of page - rebrand to stacc.art demo */}
      <footer className="p-2 text-center text-xs text-gray-400 border-t border-gray-800 mt-4">
        <div className="max-w-2xl mx-auto">
          <strong>{brand}</strong> — This is only a reference/historical/educational demo implementation of a pump.fun-style bonding curve.
          Not affiliated with or endorsed by pump.fun.
          <br />
          Reference CA:{" "}
          <a
            href="https://pump.fun/coin/Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump
          </a>
          {" | "}
          <a
            href="https://github.com/staccDOTsol/pumprecovery"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            GitHub
          </a>
          {" | "}
          <a
            href="https://github.com/staccDOTsol/pumprecovery/blob/main/pump/pump-v2-frontend/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            deploy your own mirror ↗
          </a>
          {" | "}
          <a
            href="https://stacc.show"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            mirror index (stacc.show) ↗
          </a>
        </div>
      </footer>

      {/* <Chatbox /> */}
    </div>
  );
};

export default NavBar;
