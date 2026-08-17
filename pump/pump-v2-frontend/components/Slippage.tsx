import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { useSlippage } from "@/hooks/useSlippage";

export const Slippage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { slippage, setSlippage } = useSlippage();

  return (
    <Dialog open={isOpen} onOpenChange={(v) => setIsOpen(v)}>
      <DialogTrigger asChild>
        <button className="text-xs py-1 px-2 rounded text-gray-400 hover:bg-gray-800 bg-primary">
          Set max slippage
        </button>
      </DialogTrigger>

      <DialogContent className="bg-primary text-white text-center max-w-[400px]">
        <div className="grid gap-2 w-fit justify-self-center">
          <div>Set max. slippage (%)</div>

          <input
            className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2 w-fit justify-self-center"
            id="slippage"
            placeholder=""
            type="number"
            value={slippage}
            onChange={(e: any) => setSlippage(e.target.value)}
          />

          <div className="text-xs">
            This is the maximum amount of slippage you are willing to accept
            when placing trades
          </div>

          <div
            className="text-slate-50 hover:font-bold hover:text-slate-50 cursor-pointer w-fit justify-self-center"
            onClick={() => setIsOpen(false)}
          >
            [close]
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
