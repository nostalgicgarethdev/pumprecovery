import { Coin } from "@/hooks/useCoins";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useEffect, useMemo, useState } from "react";
import {
  LiquidityPoolKeys,
  Liquidity,
  TokenAmount,
  Token,
  Percent,
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
  TokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  LiquidityPoolJsonInfo,
  jsonInfo2PoolKeys,
  generatePubKey,
  LiquidityPoolInfo,
  MarketStateLayout,
  MarketState,
} from "@raydium-io/raydium-sdk";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { sendTransaction } from "@/utils/sendTransaction";

const openbookProgramId = new PublicKey(
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"
);

const raydiumProgramId = new PublicKey(
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);

const tokenProgramId = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

function calcAmountOut(
  poolInfo: LiquidityPoolInfo,
  poolKeys: LiquidityPoolKeys,
  rawAmountIn: number,
  swapInDirection: boolean,
  slippageAmount: number
) {
  let currencyInMint = poolKeys.baseMint;
  let currencyInDecimals = poolInfo.baseDecimals;
  let currencyOutMint = poolKeys.quoteMint;
  let currencyOutDecimals = poolInfo.quoteDecimals;

  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint;
    currencyInDecimals = poolInfo.quoteDecimals;
    currencyOutMint = poolKeys.baseMint;
    currencyOutDecimals = poolInfo.baseDecimals;
  }

  const currencyIn = new Token(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    currencyInMint,
    currencyInDecimals
  );
  const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
  const currencyOut = new Token(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    currencyOutMint,
    currencyOutDecimals
  );
  const slippage = new Percent(Math.floor(slippageAmount), 100); // 0% slippage

  const {
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  } = Liquidity.computeAmountOut({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage,
  });

  return {
    amountIn,
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  };
}

import {
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
} from "@raydium-io/raydium-sdk";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { humanizeTokenAmount } from "@/utils/humanizeTokenAmount";
import { lamportsToSol } from "@/utils/lamportsToSol";
import BN from "bn.js";
import { useSlippage } from "@/hooks/useSlippage";
import { Slippage } from "./Slippage";
import { usePriorityFee } from "@/providers/PriorityFeeProvider";
import { useToast } from "./ui/use-toast";
import { Oval } from "react-loader-spinner";
import { useRpcUrl } from "@/providers/RpcUrlProvider";

// Define a function to fetch and decode OpenBook accounts
async function fetchOpenBookAccount(
  connection: Connection,
  marketId: PublicKey
) {
  const account = await connection.getAccountInfo(marketId);

  if (!account) return;

  return MARKET_STATE_LAYOUT_V3.decode(account.data);
}

const WSOL = new PublicKey("So11111111111111111111111111111111111111112");

export const RaydiumTradeBox = ({ coin }: { coin: Coin }) => {
  const [tokenAmount, setTokenAmount] = useState<number>();
  const [nativeAmount, setNativeAmount] = useState<number>();
  const { signTransaction, publicKey } = useWallet();
  const { connection } = useConnection();
  const [marketInfo, setMarketInfo] = useState<MarketState>();
  const [poolInfo, setPoolInfo] = useState<LiquidityPoolInfo>();
  const [poolKeys, setPoolKeys] = useState<any>();
  const [isBuy, setIsBuy] = useState(true);
  const [userTokenBalance, setUserTokenBalance] = useState<BN>();
  const { slippage } = useSlippage();
  const { priorityFee, tipAccount } = usePriorityFee();
  const { toastTransaction } = useToast();
  const { rpcUrl } = useRpcUrl();

  // coin.mint = "GihRfDrrBp8bXXf2fbPR4ya3C7c92zVGnEWuRUwdQaw8";

  const fetchUserTokenBalance = async () => {
    if (!publicKey) return;

    const associatedUser = getAssociatedTokenAddressSync(
      new PublicKey(coin.mint),
      publicKey,
      true
    );

    try {
      const accountInfo = await getAccount(connection, associatedUser);
      setUserTokenBalance(new BN(accountInfo.amount.toString()));
    } catch (error) {
      console.error("Failed to fetch user token balance:", error);
      setUserTokenBalance(new BN(0));
    }
  };

  const fetchMarketInfo = async () => {
    if (!coin.market_id) return;

    const marketInfo = await fetchOpenBookAccount(
      connection,
      new PublicKey(coin.market_id)
    );

    setMarketInfo(marketInfo);
  };

  const fetchPoolInfo = async () => {
    if (!poolKeys) return;

    const poolInfo = await Liquidity.fetchInfo({
      connection,
      poolKeys,
    });

    setPoolInfo(poolInfo);
  };

  useEffect(() => {
    fetchMarketInfo();
  }, [coin.market_id, connection]);

  useEffect(() => {
    if (!coin.market_id) return;
    if (!marketInfo) return;

    const associatedPoolKeys = Liquidity.getAssociatedPoolKeys({
      version: 4,
      marketVersion: 3,
      marketId: new PublicKey(coin.market_id),
      baseMint: !coin.inverted
        ? new PublicKey("So11111111111111111111111111111111111111112")
        : new PublicKey(coin.mint),
      quoteMint: !coin.inverted
        ? new PublicKey(coin.mint)
        : new PublicKey("So11111111111111111111111111111111111111112"),
      baseDecimals: !coin.inverted ? 6 : 9,
      quoteDecimals: !coin.inverted ? 9 : 6,
      programId: raydiumProgramId,
      marketProgramId: openbookProgramId,
    });

    const poolKeys = {
      id: associatedPoolKeys.id,
      baseMint: associatedPoolKeys.quoteMint,
      quoteMint: associatedPoolKeys.baseMint,
      lpMint: associatedPoolKeys.lpMint,
      baseDecimals: !coin.inverted ? 6 : 9,
      quoteDecimals: !coin.inverted ? 9 : 6,
      lpDecimals: 6,
      version: 4,
      programId: raydiumProgramId,
      authority: associatedPoolKeys.authority,
      openOrders: associatedPoolKeys.openOrders,
      targetOrders: associatedPoolKeys.targetOrders,
      baseVault: associatedPoolKeys.baseVault,
      quoteVault: associatedPoolKeys.quoteVault,
      withdrawQueue: associatedPoolKeys.withdrawQueue,
      lpVault: associatedPoolKeys.lpVault,
      marketVersion: 4,
      marketProgramId: openbookProgramId,
      marketId: associatedPoolKeys.marketId,
      marketAuthority: associatedPoolKeys.marketAuthority,
      marketBaseVault: marketInfo.baseVault,
      marketQuoteVault: marketInfo.quoteVault,
      marketBids: marketInfo.bids,
      marketAsks: marketInfo.asks,
      marketEventQueue: marketInfo.eventQueue,
      lookupTableAccount: new PublicKey("11111111111111111111111111111111"),
    };

    setPoolKeys(poolKeys);
  }, [marketInfo]);

  useEffect(() => {
    fetchPoolInfo();

    const interval = setInterval(() => {
      fetchPoolInfo();
    }, 10_000);

    return () => clearInterval(interval);
  }, [poolKeys, connection]);

  useEffect(() => {
    fetchUserTokenBalance();
  }, [coin.mint, publicKey]);

  const inputs = useMemo(() => {
    if (!poolInfo) return;
    if (!poolKeys) return;

    if (
      (isBuy && nativeAmount && nativeAmount > 0) ||
      (!isBuy && tokenAmount && tokenAmount > 0)
    ) {
      const raw = calcAmountOut(
        poolInfo,
        poolKeys,
        isBuy ? Number(nativeAmount) : Number(tokenAmount),
        !coin.inverted ? !isBuy : isBuy,
        slippage
      );

      const pretty = calcAmountOut(
        poolInfo,
        poolKeys,
        isBuy ? Number(nativeAmount) : Number(tokenAmount),
        !coin.inverted ? !isBuy : isBuy,
        0
      );

      return { raw, pretty };
    }

    return null;
  }, [poolInfo, poolKeys, isBuy, nativeAmount, tokenAmount, slippage]);

  const buy = async () => {
    if (!publicKey) return;
    if (!signTransaction) return;
    if (!marketInfo) return;
    if (!coin.market_id) return;
    if (!poolKeys) return;
    if (!poolInfo) return;
    if (!inputs) return;

    try {
      const { amountIn, minAmountOut } = inputs.raw;

      const associatedUser = getAssociatedTokenAddressSync(
        new PublicKey(coin.mint),
        publicKey,
        true
      );

      const userTokenAccount = await getAccount(
        connection,
        associatedUser
      ).catch((e) => null);

      const associatedUserWsol = getAssociatedTokenAddressSync(
        WSOL,
        publicKey,
        true
      );

      const userTokenAccountWsol = await getAccount(
        connection,
        associatedUserWsol
      ).catch((e) => null);

      const tokenAccounts = [];

      if (userTokenAccount)
        tokenAccounts.push({
          pubkey: associatedUser,
          programId: tokenProgramId,
          accountInfo: userTokenAccount,
        });

      if (userTokenAccountWsol)
        tokenAccounts.push({
          pubkey: associatedUserWsol,
          programId: tokenProgramId,
          accountInfo: userTokenAccountWsol,
        });

      const {
        result: { priorityFeeEstimate },
      } = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getPriorityFeeEstimate",
          params: [
            {
              priority_level: "HIGH",
              accountKeys: [raydiumProgramId.toBase58()],
            },
          ],
        }),
      }).then((r) => r.json());

      const swapTransaction = await Liquidity.makeSwapInstructionSimple({
        connection,
        makeTxVersion: 0,
        poolKeys,
        userKeys: {
          tokenAccounts: tokenAccounts as any,
          owner: publicKey,
        },
        amountIn: amountIn,
        amountOut: minAmountOut,
        fixedSide: "in",
        config: {
          bypassAssociatedCheck: false,
        },
        computeBudgetConfig: {
          microLamports: Math.max(priorityFeeEstimate, 500_000),
        },
      });

      const recentBlockhash = await connection
        .getLatestBlockhash("finalized")
        .then((v) => v.blockhash);

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash,
          instructions: [
            ...swapTransaction.innerTransactions[0].instructions,
            tipAccount
              ? SystemProgram.transfer({
                  fromPubkey: publicKey,
                  toPubkey: new PublicKey(tipAccount),
                  lamports: Math.max(
                    Math.floor((priorityFee * 750_000) / 1_000_000),
                    300000
                  ),
                })
              : null,
          ].filter(Boolean) as TransactionInstruction[],
        }).compileToV0Message()
      );

      const signedTx = await signTransaction(tx);
      const signature = await sendTransaction(signedTx, connection);

      if (isBuy) {
        await toastTransaction({
          title: `buy ${humanizeTokenAmount(inputs.pretty.amountOut.raw)} ${
            coin.symbol
          } for ${nativeAmount} SOL`,
          signature,
        });
      } else {
        await toastTransaction({
          title: `sell ${tokenAmount} ${coin.symbol} for ${lamportsToSol(
            inputs.pretty.amountOut.raw
          )} SOL`,
          signature,
        });
      }
    } catch (e) {
      console.error("could not submit trade", e);

      await toastTransaction({
        title: "Could not submit trade",
        description: (e as any)?.message,
        status: "error",
      });
    }
  };

  return (
    <div className="w-[350px] grid gap-4">
      <div className="bg-blue-500 p-2 rounded text-white">
        Trade on raydium via Pump
      </div>

      {!poolInfo ? (
        <div className="flex items-center justify-center gap-2 text-white">
          Loading trade interface
          <Oval color="white" height={24} width={24} />
        </div>
      ) : (
        <div className="bg-[#2e303a] p-4 rounded-lg border border-none text-gray-400 grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsBuy(true)} // Call toggleBuySell with true for buying
              className={`p-2 text-center rounded ${
                isBuy
                  ? "bg-green-400 text-primary"
                  : "bg-gray-800 text-grey-600"
              }`}
            >
              Buy
            </button>

            <button
              onClick={() => setIsBuy(false)} // Call toggleBuySell with false for selling
              className={`p-2 text-center rounded ${
                !isBuy ? "bg-red-400 text-white" : "bg-gray-800 text-grey-600"
              }`}
            >
              Sell
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <div />

              <Slippage />
            </div>

            <div className="flex items-center rounded-md relative bg-[#2e303a]">
              <Input
                placeholder="0.0"
                type="number"
                value={isBuy ? nativeAmount : tokenAmount}
                className="bg-transparent text-white outline-none w-full pl-3"
                onChange={(e: any) =>
                  isBuy
                    ? setNativeAmount(e.target.value)
                    : setTokenAmount(e.target.value)
                }
              />
              <div className="flex items-center ml-2 absolute right-2">
                <span className="text-white mr-2">
                  {isBuy ? "SOL" : coin.symbol}
                </span>

                <img
                  className="w-8 h-8 rounded-full"
                  src={
                    isBuy
                      ? "https://www.liblogo.com/img-logo/so2809s56c-solana-logo-solana-crypto-logo-png-file-png-all.png"
                      : coin.image_uri
                  }
                  alt={isBuy ? "SOL" : coin.name}
                />
              </div>
            </div>

            {isBuy ? (
              <div className="flex mt-2 bg-[#2e303a] p-1 rounded-lg">
                <button
                  onClick={() => setNativeAmount("" as any)}
                  className="text-xs py-1 -ml-1 px-2 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  reset
                </button>

                {[1, 5, 10].map((v) => (
                  <button
                    key={v}
                    onClick={() => setNativeAmount(v)}
                    className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                  >
                    {v} SOL
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex mt-2 bg-[#2e303a] p-1 rounded-lg">
                <button
                  onClick={() => setTokenAmount("" as any)}
                  className="text-xs py-1 -ml-1 px-2 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  reset
                </button>

                {[25, 50, 75, 100].map((v) => (
                  <button
                    key={v}
                    className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                    onClick={() =>
                      setTokenAmount(
                        humanizeTokenAmount(
                          userTokenBalance?.mul(new BN(v)).div(new BN(100)) ||
                            new BN(0)
                        ) as any
                      )
                    }
                  >
                    {v}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {isBuy && inputs && (
            <div>
              {humanizeTokenAmount(inputs.pretty.minAmountOut.raw)}{" "}
              {coin.symbol}
            </div>
          )}

          {!isBuy && inputs && (
            <div>{lamportsToSol(inputs.pretty.minAmountOut.raw)} SOL</div>
          )}

          <Button
            className="bg-green-400 text-primary w-full py-3 rounded-md hover:bg-green-200"
            onClick={buy}
          >
            place trade
          </Button>
        </div>
      )}
    </div>
  );
};
