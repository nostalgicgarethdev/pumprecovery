"use client";

import {
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { useLocalStorage } from "@uidotdev/usehooks";
import { useBrand } from "@/lib/useBrand";

export function HowItWorks() {
  // WhyNotPump is the first-load blurb now; HowItWorks opens only via its button
  const [isOpen, setIsOpen] = useLocalStorage("show-how-it-works", false);
  const brand = useBrand();

  return (
    <Dialog open={isOpen} onOpenChange={(v) => setIsOpen(v)}>
      <DialogTrigger asChild>
        <button className="text-sm text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50">
          [how it works]
        </button>
      </DialogTrigger>

      <DialogContent className="bg-primary text-white p-4 text-center">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center">How it works</DialogTitle>
        </DialogHeader>

        <div>
          {brand} prevents rugs by making sure that all created tokens are
          safe. Each coin on {brand} is a{" "}
          <span className="text-green-300 bold">fair-launch</span> with{" "}
          <span className="text-blue-300">no presale</span> and{" "}
          <span className="text-orange-300">no team allocation.</span>
        </div>

        <div className="bg-primary text-white p-4 space-y-4">
          <div className="text-gray-300">step 1: pick a coin that you like</div>
          <div className="text-gray-300">
            step 2: buy the coin on the bonding curve
          </div>
          <div className="text-gray-300">
            step 3: sell at any time to lock in your profits or losses
          </div>
          <div className="text-gray-300">
            step 4: every buy &amp; sell also splits fees 1/3 to referrers, 1/3
            into permanent LP, and 1/3 to buy &amp; burn $Pump&nbsp;ICO
          </div>
          <div className="text-gray-300">
            step 5: when the bonding curve sells out the coin graduates to a DEX
            and its liquidity is locked forever
          </div>
        </div>

        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          className="text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
        >
          [I{"'"}m ready to stacc]
        </Button>
      </DialogContent>
    </Dialog>
  );
}
