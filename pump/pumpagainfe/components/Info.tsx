import {
  CardTitle,
  CardDescription,
  CardHeader,
  CardContent,
  Card,
} from "@/components/ui/card";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { Progress } from "./ui/progress";
import { Coin } from "@/hooks/useCoins";
import { useBondingCurve } from "@/hooks/useBondingCurve";
import { BN } from "bn.js";
import { humanizeTokenAmount } from "@/utils/humanizeTokenAmount";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { HolderDistribution } from "./HolderDistribution";
import { useState } from "react";
import clsx from "clsx";
import { useInitialBondingCurveParams } from "@/hooks/useInitialBondingCurveParams";

interface InfoProps {
  coin: Coin;
}

export default function Info({ coin }: InfoProps) {
  const {
    name,
    description,
    symbol,
    image_uri,
    bonding_curve,
    twitter,
    telegram,
    website,
  } = coin;

  const {
    bondingCurve,
    global,
    getFinalUSDMarketCap,
    getKingOfTheHillMarketCap,
  } = useBondingCurve(coin);

  const { initialBondingCurveParams } = useInitialBondingCurveParams(coin.mint);

  const [expandImage, setExpandImage] = useState(false);

  if (!bondingCurve) return null;
  if (!global) return null;

  const {
    realTokenReserves,
    realSolReserves,
    virtualSolReserves,
    virtualTokenReserves,
    tokenTotalSupply,
  } = bondingCurve;

  if (!initialBondingCurveParams) return null;

  const {
    initial_real_token_reserves,
    initial_virtual_token_reserves,
    initial_virtual_sol_reserves,
  } = initialBondingCurveParams;

  const progress = new BN(100)
    .sub(
      realTokenReserves
        .mul(new BN(100))
        .div(new BN(initial_real_token_reserves))
    )
    .toNumber();

  const humanizedInitialVirtualTokenReserves = humanizeTokenAmount(
    initial_virtual_token_reserves
  );
  const humanizedInitialVirtualSolReserves = lamportsToSol(
    new BN(initial_virtual_sol_reserves)
  );
  const humanizedKingOfTheHillMarketCap = lamportsToSol(
    new BN(process.env.NEXT_PUBLIC_KING_OF_THE_HILL_MARKET_CAP as string)
  );
  const humanizedTotalSupply = humanizeTokenAmount(tokenTotalSupply);
  const kingOfTheHillProgress = Math.min(
    new BN(initial_real_token_reserves)
      .sub(realTokenReserves)
      .mul(new BN(100))
      .div(
        new BN(
          (
            Math.max(
              humanizedInitialVirtualTokenReserves -
                Math.sqrt(
                  (humanizedInitialVirtualTokenReserves *
                    humanizedInitialVirtualSolReserves *
                    humanizedTotalSupply) /
                    humanizedKingOfTheHillMarketCap
                ),
              1
            ) *
            10 ** 6
          ).toFixed(0)
        )
      )
      .toNumber(),
    100
  );

  return (
    <div className="w-[350px] bg-transparent text-gray-400 rounded-lg border border-none grid gap-4">
      {(twitter || telegram || website) && (
        <div className="flex gap-4">
          {twitter && (
            <a
              href={twitter}
              target="_blank"
              rel="noopener noreferrer"
              className=" text-gray-400 hover:underline"
            >
              [twitter]
            </a>
          )}

          {telegram && (
            <a
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              className=" text-gray-400 hover:underline"
            >
              [telegram]
            </a>
          )}

          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className=" text-gray-400 hover:underline"
            >
              [website]
            </a>
          )}
        </div>
      )}

      <div
        className={clsx(
          "gap-3 h-fit items-start",
          expandImage ? "grid" : "flex"
        )}
      >
        <img
          src={image_uri}
          className={clsx(
            "w-32 object-contain cursor-pointer",
            expandImage && "w-full"
          )}
          onClick={() => setExpandImage(!expandImage)}
        />

        <div>
          <div className="font-bold text-sm">
            {name} (ticker: {symbol})
          </div>

          <div className="text-xs text-gray-400">{description}</div>
        </div>
      </div>

      <div>
        <div className="text-sm text-gray-400 mb-1">
          bonding curve progress: {progress}%
        </div>

        <Progress
          className="w-full bg-gray-700"
          value={progress}
          barColor="bg-green-300"
        />
      </div>

      <div className="text-xs text-gray-400">
        when the market cap reaches ${getFinalUSDMarketCap()} all the liquidity
        from the bonding curve will be deposited into Raydium and burned.
        progression increases as the price goes up.
        <br />
        <br />
        there are {humanizeTokenAmount(realTokenReserves).toLocaleString()}{" "}
        tokens still available for sale in the bonding curve and there is{" "}
        {lamportsToSol(realSolReserves).toLocaleString()} SOL in the bonding
        curve.
      </div>

      {coin.king_of_the_hill_timestamp ? (
        <div className="text-yellow-500 font-bold">
          👑 Crowned king of the hill on{" "}
          {new Date(coin.king_of_the_hill_timestamp).toLocaleString()}
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="text-sm text-gray-400">
            king of the hill progress: {kingOfTheHillProgress}%
          </div>

          <Progress
            className="w-full bg-gray-700"
            value={kingOfTheHillProgress}
            barColor="bg-yellow-500"
          />

          <div className="text-xs text-gray-400">
            dethrone the current king at a ${getKingOfTheHillMarketCap()} mcap
          </div>
        </div>
      )}

      <HolderDistribution coin={coin} />
    </div>
  );
}
