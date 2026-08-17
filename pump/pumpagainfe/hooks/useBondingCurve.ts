import { BN } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useGlobal } from "./useGlobal";
import { usePumpProgram } from "./usePumpProgram";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { useInitialBondingCurveParams } from "./useInitialBondingCurveParams";
import { Coin } from "./useCoins";

export interface BondingCurve {
  virtualTokenReserves: BN;
  virtualSolReserves: BN;
  realTokenReserves: BN;
  realSolReserves: BN;
  tokenTotalSupply: BN;
  complete: boolean;
}

export const useBondingCurve = (coin?: Coin) => {
  const [bondingCurve, setBondingCurve] = useState<BondingCurve>();
  const [loading, setLoading] = useState(false);
  const { connection } = useConnection();
  const { global } = useGlobal();
  const { pumpProgram } = usePumpProgram();
  const [solPrice, setSolPrice] = useState(0);

  const getFinalVirtualSolReserves = (): BN => {
    return new BN(85 * 10 ** 9);
  };

  const fetchBondingCurve = async () => {
    if (!coin) return;
    if (!pumpProgram) return;

    setLoading(true);

    // query the curve
    const bondingCurve = await pumpProgram.account.bondingCurve.fetch(
      coin.bonding_curve
    );

    setBondingCurve(bondingCurve as any);
    setLoading(false);
  };

  const fetchSolPrice = async () => {
    const { solPrice } = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/sol-price`
    ).then((r) => r.json());

    setSolPrice(solPrice);
  };

  const watchBondingCurve = () => {
    if (!coin) return;
    if (!pumpProgram) return;

    fetchBondingCurve();

    const subscriptionId = connection.onAccountChange(
      new PublicKey(coin.bonding_curve),
      () => {
        fetchBondingCurve();
      }
    );

    const removeListener = () =>
      connection.removeAccountChangeListener(subscriptionId);

    return removeListener;
  };

  useEffect(() => {
    const removeListener = watchBondingCurve();
    fetchSolPrice();

    return () => {
      if (removeListener) removeListener();
    };
  }, [coin, pumpProgram]);

  const getFee = (solAmount: BN) => {
    if (!global) return new BN(0);

    return solAmount.mul(global.feeBasisPoints).div(new BN(10_000));
  };

  const buyQuote = (amount: BN, solBuy: boolean) => {
    if (amount.eq(new BN(0))) return new BN(0);
    if (!bondingCurve) return new BN(0);

    let solCost: BN;
    let tokensReceived: BN;

    if (solBuy) {
      const k = bondingCurve.virtualSolReserves.mul(
        bondingCurve.virtualTokenReserves
      );

      const newVirtualSolReserves = bondingCurve.virtualSolReserves.add(amount);
      const newVirtualTokenReserves = k
        .div(newVirtualSolReserves)
        .add(new BN(1));

      tokensReceived = bondingCurve.virtualTokenReserves.sub(
        newVirtualTokenReserves
      );

      tokensReceived = BN.min(tokensReceived, bondingCurve.realTokenReserves);

      solCost = amount;
    } else {
      amount = BN.min(amount, bondingCurve.realTokenReserves);
      solCost = amount
        .mul(bondingCurve.virtualSolReserves)
        .div(bondingCurve.virtualTokenReserves.sub(amount))
        .add(new BN(1));
      tokensReceived = amount;
    }

    const fee = getFee(solCost);
    return solBuy ? tokensReceived : solCost.add(fee);
  };

  const sellQuote = (amount: BN) => {
    if (amount.eq(new BN(0))) return new BN(0);
    if (!bondingCurve) return new BN(0);

    const solCost = amount
      .mul(bondingCurve.virtualSolReserves)
      .div(bondingCurve.virtualTokenReserves.add(amount));

    const fee = getFee(solCost);

    return solCost.sub(fee);
  };

  const getUSDMarketCap = () => {
    if (!bondingCurve) return 0;
    if (!global) return 0;

    const {
      virtualSolReserves,
      virtualTokenReserves,
      tokenTotalSupply,
    } = bondingCurve;

    if (virtualTokenReserves.eq(new BN(0))) {
      return 0;
    }

    const marketCap =
      tokenTotalSupply
        .mul(virtualSolReserves)
        .div(virtualTokenReserves)
        .toNumber() /
      10 ** 9;

    const usdMarketCap = Number(
      (marketCap * solPrice).toFixed(10)
    ).toLocaleString();

    return usdMarketCap;
  };

  const getFinalUSDMarketCap = () => {
    if (!bondingCurve) return 0;
    if (!global) return 0;

    const {
      virtualSolReserves,
      virtualTokenReserves,
      tokenTotalSupply,
      realTokenReserves,
    } = bondingCurve;

    // what would it cost to buy up all the real token reserves
    const costToBuyAllRealTokenReserves = buyQuote(realTokenReserves, false);
    const finalVirtualSolReserves = virtualSolReserves.add(
      costToBuyAllRealTokenReserves
    );
    const finalVirtualTokenReserves = virtualTokenReserves.sub(
      realTokenReserves
    );

    if (finalVirtualTokenReserves.eq(new BN(0))) {
      return 0; // Return 0 or handle the case where there are no virtual token reserves left
    }

    // get the price after all real token reserves have been bought
    const marketCap =
      tokenTotalSupply
        .mul(finalVirtualSolReserves)
        .div(finalVirtualTokenReserves)
        .toNumber() /
      10 ** 9;

    return Number((marketCap * solPrice).toFixed(0)).toLocaleString();
  };

  const getKingOfTheHillMarketCap = () => {
    const marketCap = lamportsToSol(
      new BN(process.env.NEXT_PUBLIC_KING_OF_THE_HILL_MARKET_CAP as string)
    );

    return Number((marketCap * solPrice).toFixed(0)).toLocaleString();
  };

  return {
    bondingCurve,
    loading,
    fetchBondingCurve,
    buyQuote,
    sellQuote,
    global,
    getUSDMarketCap,
    solPrice,
    getFinalUSDMarketCap,
    getKingOfTheHillMarketCap,
    getFinalVirtualSolReserves,
  };
};
