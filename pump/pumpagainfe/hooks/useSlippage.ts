import { useLocalStorage } from "@uidotdev/usehooks";
import { useEffect } from "react";

export const useSlippage = () => {
  const [slippage, _setSlippage] = useLocalStorage<number>("slippage", 5);

  const setSlippage = (v?: number) => {
    _setSlippage(Math.min(v || 0, 50));
  };

  return { slippage, setSlippage };
};
