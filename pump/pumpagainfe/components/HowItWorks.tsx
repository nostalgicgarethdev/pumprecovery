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

export function HowItWorks() {
  const [isOpen, setIsOpen] = useLocalStorage("show-how-it-works", true);

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
          Pump prevents rugs by making sure that all created tokens are safe.
          Each coin on pump is a{" "}
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
            step 4: when enough people buy on the bonding curve it reaches a
            market cap of $69k
          </div>
          <div className="text-gray-300">
            step 5: $12k of liquidity is then deposited in raydium and burned
          </div>
        </div>

        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          className="text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
        >
          [I{"'"}m ready to pump]
        </Button>
      </DialogContent>
    </Dialog>
  );
}
