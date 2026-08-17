import { useEffect, useState } from "react";

export interface InitialBondingCurveParams {
  signature: string;
  slot: number;
  initial_virtual_token_reserves: number;
  initial_virtual_sol_reserves: number;
  initial_real_token_reserves: number;
  token_total_supply: number;
  timestamp: number;
  fee_basis_points: number;
}

export const useInitialBondingCurveParams = (timestamp?: number) => {
  const [initialBondingCurveParams, setInitialBondingCurveParams] = useState<
    InitialBondingCurveParams
  >();

  const fetchInitialBondingCurveParams = async () => {
    if (!timestamp) return;

    const initialBondingCurveParams = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/global-params/${timestamp}`
    ).then((r) => r.json());

    setInitialBondingCurveParams((v) =>
      v === initialBondingCurveParams.signature ? v : initialBondingCurveParams
    );
  };

  useEffect(() => {
    fetchInitialBondingCurveParams();
  }, [timestamp]);

  return { initialBondingCurveParams, fetchInitialBondingCurveParams };
};
