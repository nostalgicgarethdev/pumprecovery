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

export const useInitialBondingCurveParams = (mint?: string) => {
  const [initialBondingCurveParams, setInitialBondingCurveParams] = useState<
    InitialBondingCurveParams
  >();

  const fetchInitialBondingCurveParams = async () => {
    if (!mint) return;

    const initialBondingCurveParams = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/global-params/${mint}`
    ).then((r) => r.json());

    setInitialBondingCurveParams((v) =>
      v === initialBondingCurveParams.signature ? v : initialBondingCurveParams
    );
  };

  useEffect(() => {
    fetchInitialBondingCurveParams();
  }, [mint]);

  return { initialBondingCurveParams, fetchInitialBondingCurveParams };
};
