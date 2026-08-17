"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { Progress } from "./ui/progress";
import { useBondingCurve } from "@/hooks/useBondingCurve";
import { Coin } from "@/hooks/useCoins";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { BN } from "@coral-xyz/anchor";
import { usePumpProgram } from "@/hooks/usePumpProgram";
import { useGlobal } from "@/hooks/useGlobal";
import {
  ACCOUNT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptAccount,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import Info from "./Info";
import clsx from "clsx";
import { useToast } from "./ui/use-toast";
import { ToastAction } from "./ui/toast";
import { CommentInput } from "./CommentInput";
import { Comments } from "./Comments";
import { useSlippage } from "@/hooks/useSlippage";
import { Slippage } from "./Slippage";
import { usePriorityFee } from "@/providers/PriorityFeeProvider";
import { Thread } from "./Thread";
import { sendTransaction } from "@/utils/sendTransaction";
import { useSolBalance } from "@/hooks/useSolBalance";
import { useTokenBalance } from "@/hooks/useTokenBalance";

interface TradeProps {
  title: string;
  holders?: any[];
  progress?: number;
  logo?: string;
  description?: string;
  coin: Coin;
  showInput?: boolean;
}

export default function TradeBox({
  title,
  holders,
  logo,
  description,
  coin,
  showInput,
}: TradeProps) {
  const [isBuySelected, setIsBuySelected] = useState(true);
  const [amount, setAmount] = useState<number>();
  const [solAmount, setSolAmount] = useState<number>();
  const { global, globalPDA } = useGlobal();
  const { slippage } = useSlippage();
  const {
    bondingCurve,
    loading: bondingCurveLoading,
    buyQuote,
    sellQuote,
  } = useBondingCurve(coin);
  const { pumpProgram } = usePumpProgram();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { signTransaction, publicKey } = useWallet();
  const { solBalance } = useSolBalance(publicKey?.toBase58());
  const { tokenBalance, rawTokenBalance } = useTokenBalance(
    coin.mint,
    publicKey?.toBase58()
  );
  const { toastTransaction } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [nativeSelected, setNativeSelected] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const { priorityFee, tipAccount } = usePriorityFee();

  const parsedAmount = nativeSelected
    ? new BN(Math.floor((solAmount || 0) * 10 ** 9))
    : new BN(Math.floor(amount || 0).toString()).mul(new BN("1000000"));

  const createComment = async (comment: string, signature: string) => {
    await fetch(process.env.NEXT_PUBLIC_API_URL + "/comments", {
      method: "POST",
      body: JSON.stringify({ comment, signature }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  const setAmountFromPercentage = async (percentage: number) => {
    if (!rawTokenBalance) return;

    const amount = rawTokenBalance.mul(new BN(percentage)).div(new BN(100));
    const amountInTokens = amount.toNumber() / 10 ** 6;
    setAmount(amountInTokens);

    const quote = sellQuote(amount);
    const solAmountInSol = lamportsToSol(quote);
    setSolAmount(solAmountInSol);
  };

  const openCommentModal = async () => {
    if (!wallet) {
      toastTransaction({
        title: "wallet not connected",
        description: "please connect your wallet to place a trade.",
        status: "error",
      });
      return;
    }

    if (!amount || amount <= 0) {
      toastTransaction({
        title: "invalid amount",
        description: "please enter a valid amount to trade.",
        status: "error",
      });
      return;
    }

    setShowCommentModal(true);
  };

  const buy = async (comment?: string) => {
    try {
      if (!amount) return;
      if (!bondingCurve) return;
      if (!pumpProgram) return;
      if (!global) return;
      if (!globalPDA) return;
      if (!wallet) return;
      if (!signTransaction) return;
      if (!publicKey) return;

      let tokensToBuy = new BN(0);
      let solRequired = new BN(0);

      if (nativeSelected) {
        tokensToBuy = buyQuote(parsedAmount, true);
        solRequired = parsedAmount;

        if (!global) return;
        const fee = solRequired.mul(global.feeBasisPoints).div(new BN(10_000));
        solRequired = solRequired.add(fee);
      } else {
        solRequired = buyQuote(parsedAmount, false);
        tokensToBuy = parsedAmount;
      }

      const associatedUser = getAssociatedTokenAddressSync(
        new PublicKey(coin.mint),
        wallet.publicKey,
        true
      );

      const userTokenAccount = await getAccount(
        connection,
        associatedUser
      ).catch((e) => null);

      const buyInstruction = await pumpProgram.methods
        .buy(
          tokensToBuy,
          // new BN(0)
          solRequired.add(
            solRequired.mul(new BN(Math.floor(slippage * 10))).div(new BN(1000))
          )
        )
        .accounts({
          feeRecipient: global.feeRecipient,
          global: globalPDA,
          mint: coin.mint,
          bondingCurve: coin.bonding_curve,
          associatedBondingCurve: coin.associated_bonding_curve,
          associatedUser,
          user: wallet.publicKey,
        })
        .instruction();

      const recentBlockhash = await connection
        .getLatestBlockhash("finalized")
        .then((v) => v.blockhash);

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash,
          instructions: [
            tipAccount
              ? SystemProgram.transfer({
                  fromPubkey: wallet.publicKey,
                  toPubkey: new PublicKey(tipAccount),
                  lamports: Math.max(
                    Math.floor((priorityFee * 300_000) / 1_000_000),
                    300000
                  ),
                })
              : null,
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: priorityFee,
            }),
            userTokenAccount
              ? null
              : createAssociatedTokenAccountInstruction(
                  wallet.publicKey,
                  associatedUser,
                  wallet.publicKey,
                  new PublicKey(coin.mint)
                ),
            buyInstruction,
          ].filter((v) => v !== null) as TransactionInstruction[],
        }).compileToV0Message()
      );

      const signedTx = await signTransaction(tx);
      const signature = await sendTransaction(signedTx, connection);

      if (comment) createComment(comment, signature);

      setAmount(("" as any) as number);

      await toastTransaction({
        title: `buy ${amount} ${coin.symbol} for ${lamportsToSol(
          solRequired
        )} SOL`,
        signature,
      });
    } catch (e) {
      console.error("could not submit buy", e);

      await toastTransaction({
        title: "Could not submit buy",
        description: (e as any)?.message,
        status: "error",
      });
    }
  };

  const sell = async (comment?: string) => {
    try {
      if (!amount) return;
      if (!bondingCurve) return;
      if (!pumpProgram) return;
      if (!global) return;
      if (!globalPDA) return;
      if (!wallet) return;
      if (!signTransaction) return;
      if (!publicKey) return;

      const associatedUser = getAssociatedTokenAddressSync(
        new PublicKey(coin.mint),
        wallet.publicKey,
        true
      );

      const amountToSell = parsedAmount;
      const quote = sellQuote(amountToSell);

      const sellInstruction = await pumpProgram.methods
        .sell(
          amountToSell,
          quote.sub(
            quote.mul(new BN(Math.floor(slippage * 10))).div(new BN(1000))
          )
        )
        .accounts({
          feeRecipient: global.feeRecipient,
          global: globalPDA,
          mint: coin.mint,
          bondingCurve: coin.bonding_curve,
          associatedBondingCurve: coin.associated_bonding_curve,
          associatedUser,
          user: wallet.publicKey,
        })
        .instruction();

      const recentBlockhash = await connection
        .getLatestBlockhash("finalized")
        .then((v) => v.blockhash);

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash,
          instructions: [
            tipAccount
              ? SystemProgram.transfer({
                  fromPubkey: wallet.publicKey,
                  toPubkey: new PublicKey(tipAccount),
                  lamports: Math.max(
                    Math.floor((priorityFee * 300_000) / 1_000_000),
                    300000
                  ),
                })
              : null,
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: priorityFee,
            }),
            sellInstruction,
          ].filter((v) => v !== null) as TransactionInstruction[],
        }).compileToV0Message()
      );

      const signedTx = await signTransaction(tx);
      const signature = await sendTransaction(signedTx, connection);

      if (comment) createComment(comment, signature);

      // send this signed tx to the backend
      setAmount(("" as any) as number);

      toastTransaction({
        title: `sell ${amount} ${coin.symbol} for ${lamportsToSol(quote)} SOL`,
        signature,
      });
    } catch (e) {
      console.error("could not submit sell", e);

      await toastTransaction({
        title: "Could not submit sell",
        description: (e as any)?.message,
        status: "error",
      });
    }
  };

  const handleSolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isResetting) return;

    const newSolAmount = parseFloat(e.target.value);
    if (isNaN(newSolAmount)) {
      setSolAmount(("" as any) as number);
      setAmount(("" as any) as number);
      return;
    }
    setSolAmount(newSolAmount);
    const solAmountInLamports = new BN(Math.floor(newSolAmount * 10 ** 9));

    const tokenAmountReceived = buyQuote(solAmountInLamports, true);

    const tokenAmountNumber = tokenAmountReceived.toNumber() / 10 ** 6;
    setAmount(tokenAmountNumber);
  };

  const handleTokenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isResetting) return;

    const newTokenAmount = parseFloat(e.target.value);
    if (isNaN(newTokenAmount)) {
      setAmount(("" as any) as number);
      setSolAmount(("" as any) as number);
      return;
    }
    setAmount(newTokenAmount);
    const tokenAmountBN = new BN(newTokenAmount * 10 ** 6);

    let solAmountRequiredLamports;
    if (isBuySelected) {
      solAmountRequiredLamports = buyQuote(tokenAmountBN, false);
    } else {
      solAmountRequiredLamports = sellQuote(tokenAmountBN);
    }

    const solAmountInSol = lamportsToSol(solAmountRequiredLamports);
    setSolAmount(solAmountInSol);
  };

  const setPresetSolAmount = (amount: number) => {
    setSolAmount(amount);
    // Convert the SOL amount to the equivalent token amount using the buy quote
    const solAmountInLamports = new BN(Math.floor(amount * 10 ** 9));
    const tokenAmountReceived = buyQuote(solAmountInLamports, true);
    const tokenAmountNumber = tokenAmountReceived.toNumber() / 10 ** 6;
    setAmount(tokenAmountNumber);
  };

  const handleTrade = async (comment?: string) => {
    if (isBuySelected) {
      await buy(comment);
    } else {
      await sell(comment);
    }
  };

  const toggleBuySell = (isBuy: boolean) => {
    setIsBuySelected(isBuy);
    setIsResetting(true);

    setAmount(("" as any) as number);
    setSolAmount(("" as any) as number);

    if (!isBuy) {
      setNativeSelected(false);
    } else {
      setNativeSelected(true);
    }

    setTimeout(() => {
      setIsResetting(false);
    }, 0);
  };

  return (
    <div className="w-[350px] grid gap-4">
      {/* {holders && (
        <div className="flex items-center mb-4">
          {holders.slice(0, 3).map((holder, index) => (
            <Avatar className={`w-4 h-4 ${index > 0 ? "-ml-2" : ""}`}>
              <AvatarImage className="w-full h-full" src={holder.image} />
              <AvatarFallback>{holder.name[0]}</AvatarFallback>
            </Avatar>
          ))}
          <p className="text-gray-400 text-xs ml-2">
            Bought by
            {holders.length > 0 ? ` ${holders[0].name}` : ""}
            {holders.length > 1 ? `, ${holders[1].name}` : ""}
            {holders.length > 2
              ? ` and ${holders.length - 2} other mutuals`
              : ""}
          </p>
        </div>
      )} */}

      {showInput && (
        <div className="bg-[#2e303a] p-4 rounded-lg border border-none text-gray-400 grid gap-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => toggleBuySell(true)} // Call toggleBuySell with true for buying
              className={`p-2 text-center rounded ${
                isBuySelected
                  ? "bg-green-400 text-primary"
                  : "bg-gray-800 text-grey-600"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => toggleBuySell(false)} // Call toggleBuySell with false for selling
              className={`p-2 text-center rounded ${
                !isBuySelected
                  ? "bg-red-400 text-white"
                  : "bg-gray-800 text-grey-600"
              }`}
            >
              Sell
            </button>
          </div>
          <div className="flex justify-between w-full gap-2">
            {isBuySelected ? (
              <button
                onClick={() => setNativeSelected(!nativeSelected)}
                className={`text-xs py-1 px-2 rounded ${
                  nativeSelected
                    ? "bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                    : "bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                switch to {nativeSelected ? coin.symbol : "SOL"}
              </button>
            ) : (
              <div />
            )}

            <Slippage />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center rounded-md relative bg-[#2e303a]">
              <Input
                className="bg-transparent text-white outline-none w-full pl-3"
                id="amount"
                placeholder="0.0"
                type="number"
                value={
                  isBuySelected ? (nativeSelected ? solAmount : amount) : amount
                }
                onChange={
                  nativeSelected ? handleSolInputChange : handleTokenInputChange
                }
              />
              <div className="flex items-center ml-2 absolute right-2">
                <span className="text-white mr-2">
                  {nativeSelected ? "SOL" : coin.symbol}
                </span>
                <img
                  className="w-8 h-8 rounded-full"
                  src={
                    nativeSelected
                      ? "https://www.liblogo.com/img-logo/so2809s56c-solana-logo-solana-crypto-logo-png-file-png-all.png"
                      : coin.image_uri
                  }
                  alt={nativeSelected ? "SOL" : coin.name}
                />
              </div>
            </div>
            {isBuySelected && nativeSelected && (
              <div className="flex mt-2 bg-[#2e303a] p-1 rounded-lg">
                <button
                  onClick={() => setPresetSolAmount(("" as any) as number)}
                  className="text-xs py-1 -ml-1 px-2 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  reset
                </button>
                <button
                  onClick={() => setPresetSolAmount(1)}
                  className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  1 SOL
                </button>
                <button
                  onClick={() => setPresetSolAmount(5)}
                  className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  5 SOL
                </button>
                <button
                  onClick={() => setPresetSolAmount(10)}
                  className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  10 SOL
                </button>
              </div>
            )}

            {Boolean(
              isBuySelected &&
                nativeSelected &&
                solBalance &&
                solAmount &&
                solBalance < solAmount * 10 ** 9
            ) &&
              solBalance && (
                <div className="text-red-400 text-sm">
                  Insufficient balance: You have {solBalance / 10 ** 9} SOL
                </div>
              )}

            {Boolean(
              !isBuySelected &&
                rawTokenBalance &&
                amount &&
                rawTokenBalance.lt(new BN(amount).mul(new BN(10 ** 6)))
            ) &&
              solBalance && (
                <div className="text-red-400 text-sm mt-1">
                  Insufficient balance: You have {tokenBalance} {coin.symbol}
                </div>
              )}

            {!isBuySelected && (
              <div className="flex mt-2 bg-[#2e303a] p-1 rounded-lg">
                <button
                  onClick={() => setAmountFromPercentage(0)}
                  className="text-xs py-1 -ml-1 px-2 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  reset
                </button>
                <button
                  onClick={() => setAmountFromPercentage(25)}
                  className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  25%
                </button>
                <button
                  onClick={() => setAmountFromPercentage(50)}
                  className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  50%
                </button>
                <button
                  onClick={() => setAmountFromPercentage(75)}
                  className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  75%
                </button>
                <button
                  onClick={() => setAmountFromPercentage(100)}
                  className="text-xs py-1 px-2 ml-1 rounded bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                >
                  100%
                </button>
              </div>
            )}
          </div>

          {Boolean(Number(amount || solAmount || 0)) && (
            <span className="text-sm text-gray-400">
              {isBuySelected
                ? nativeSelected
                  ? `${amount || 0} ${coin.symbol}`
                  : `${solAmount || 0} SOL`
                : `${solAmount || 0} SOL`}
            </span>
          )}

          <CommentInput
            onSubmit={handleTrade}
            isOpen={showCommentModal}
            onOpenChange={(v) => setShowCommentModal(v)}
            openCommentModal={openCommentModal}
            isTrade
            text={
              isBuySelected
                ? `buy ${amount || 0} ${coin.symbol} for ${solAmount || 0} SOL`
                : `sell ${amount || 0} ${coin.symbol} for ${solAmount || 0} SOL`
            }
          >
            <Button
              onClick={openCommentModal}
              className="bg-green-400 text-primary w-full py-3 rounded-md hover:bg-green-200"
            >
              place trade
            </Button>
          </CommentInput>
        </div>
      )}

      {/* <Info coin={coin} /> */}
    </div>
  );
}
