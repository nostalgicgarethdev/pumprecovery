"use client";

import {
  DialogTrigger,
  DialogTitle,
  DialogHeader,
  DialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { useLocalStorage } from "@uidotdev/usehooks";

export function WhyNotPump() {
  // defaults to true -> the blurb auto-opens on first load
  const [isOpen, setIsOpen] = useLocalStorage("show-why-not-pump", true);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => setIsOpen(v)}>
      <DialogTrigger asChild>
        <button className="text-sm text-yellow-300 hover:font-bold hover:bg-transparent hover:text-yellow-200">
          [why this ain{"'"}t pump]
        </button>
      </DialogTrigger>

      <DialogContent className="bg-primary text-white p-5 text-left max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            why this ain{"'"}t pump
          </DialogTitle>
        </DialogHeader>

        <p className="text-gray-300 text-sm text-center">
          a launchpad that fucks with the nash. every trade is a{" "}
          <span className="text-green-300">forced atomic bundle</span> — the
          launchpad buy/sell plus a fixed set of actions, all{" "}
          <span className="text-blue-300">same slot</span>. take it or leave it.
        </p>

        <div className="space-y-3">
          <div className="rounded-md border border-white/10 p-3">
            <div className="font-bold text-pink-300">
              unfuckable-with anti-sandwich
            </div>
            <div className="text-sm text-gray-300">
              every buy/sell is welded into one atomic instruction that{" "}
              <span className="text-white">must</span> contain the exact set of
              actions. there&apos;s no room left to wrap your trade in a
              nefarious bundle — no sandwiches, no backruns. it&apos;s all one
              tx, same slot, or it doesn&apos;t land.
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3">
            <div className="font-bold text-green-300">1/3 → LPs, forever</div>
            <div className="text-sm text-gray-300">
              every buy <span className="text-white">and</span> every sell adds
              liquidity across the venues (bonding curve + Orca whirlpools:
              SOL&nbsp;/&nbsp;USDC&nbsp;/&nbsp;$PUMP&nbsp;ICO). liquidity only goes up —
              no pure extraction, ever.
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3">
            <div className="font-bold text-orange-300">
              1/3 → referrers (3-deep)
            </div>
            <div className="text-sm text-gray-300">
              fees flow up a 3-tier referral tree. share your link, get paid on
              your whole tree&apos;s trades — tier 1, 2, and 3 — for as long as
              they trade.
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3">
            <div className="font-bold text-yellow-300">
              1/3 → buy &amp; burn $PUMP ICO
            </div>
            <div className="text-sm text-gray-300">
              every trade buys and burns{" "}
              <span className="text-white">$PUMP ICO</span>. a constant
              deflationary bid under the whole platform, paid by every single
              trade.
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3">
            <div className="font-bold text-blue-300">the coin mechanic</div>
            <div className="text-sm text-gray-300">
              still a <span className="text-green-300">fair-launch</span>: no
              presale, no team allocation. buy on the bonding curve, sell
              anytime. but now every trade also seeds LPs, pays the tree, and
              burns $PUMP ICO — bundled so it can&apos;t be gamed.
            </div>
          </div>
        </div>

        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          className="text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
        >
          [lfg]
        </Button>
      </DialogContent>
    </Dialog>
  );
}
