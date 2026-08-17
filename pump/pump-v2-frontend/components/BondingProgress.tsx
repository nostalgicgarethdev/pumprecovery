"use client";

import type { BondingCurve } from "@/hooks/useBondingCurve";
import type { Global } from "@/hooks/useGlobal";

/**
 * pump.fun-style bonding curve progress bar. Progress tracks tokens sold off
 * the curve: 1 - realTokenReserves / initialRealTokenReserves. Reaches 100%
 * exactly when the curve sells out (realTokenReserves == 0) and the coin
 * migrates. Also surfaces the graduation market cap (≈ const across coins).
 */
export function BondingProgress({
  bondingCurve,
  global,
  solPrice,
}: {
  bondingCurve?: BondingCurve;
  global?: Global;
  solPrice?: number;
}) {
  if (!bondingCurve || !global) return null;

  const sup = Number(bondingCurve.tokenTotalSupply);
  const vsr = Number(bondingCurve.virtualSolReserves);
  const vtr = Number(bondingCurve.virtualTokenReserves);

  // Current market cap (SOL) from live virtual reserves.
  const currentMcapSol = vtr > 0 ? (sup * vsr) / vtr / 1e9 : 0;

  // Graduation market cap (SOL): the curve completes when real tokens hit 0,
  // leaving (initialVirtualToken - initialRealToken) reserved. Constant per coin.
  const ivtr = Number(global.initialVirtualTokenReserves);
  const ivsr = Number(global.initialVirtualSolReserves);
  const initialReal = Number(global.initialRealTokenReserves);
  const finalVtr = ivtr - initialReal;
  let targetMcapSol = 0;
  if (finalVtr > 0) {
    const finalVsr = (ivsr * ivtr) / finalVtr;
    targetMcapSol = (sup * finalVsr) / finalVtr / 1e9;
  }

  // Progress is mcap-based so it stays consistent with the $ target shown below
  // (token-sold % runs far ahead because the curve is convex).
  const progress =
    bondingCurve.complete || targetMcapSol <= 0
      ? 100
      : Math.min(100, Math.max(0, (currentMcapSol / targetMcapSol) * 100));

  const currentUsd = currentMcapSol * (solPrice || 0);
  const targetUsd = targetMcapSol * (solPrice || 0);

  return (
    <div className="border border-gray-800 rounded p-3 w-full">
      <div className="flex justify-between items-center text-xs mb-1.5">
        <span className="text-gray-400">bonding curve progress</span>
        <span className="text-green-300 font-bold">{progress.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-300 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {targetMcapSol > 0 && (
        <p className="text-[11px] text-gray-500 mt-2 leading-snug">
          {bondingCurve.complete ? (
            <>curve complete — migrating to a DEX.</>
          ) : targetUsd > 0 ? (
            <>
              <span className="text-gray-300">
                ${Number(currentUsd.toFixed(0)).toLocaleString()}
              </span>{" "}
              / ${Number(targetUsd.toFixed(0)).toLocaleString()} mcap — graduates
              to a DEX (~{Math.round(targetMcapSol)} SOL) when the curve sells out.
            </>
          ) : (
            <>
              <span className="text-gray-300">
                {currentMcapSol.toFixed(1)} SOL
              </span>{" "}
              / ~{Math.round(targetMcapSol)} SOL mcap — graduates to a DEX when the
              curve sells out.
            </>
          )}
        </p>
      )}
    </div>
  );
}
