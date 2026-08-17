"use client";

import { Balance, useBalances } from "@/hooks/useBalances";
import { humanizeTokenAmount } from "@/utils/humanizeTokenAmount";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useBrand } from "@/lib/useBrand";

const BalanceView = ({
  balance,
  fetchBalances,
}: {
  balance: Balance;
  fetchBalances: any;
}) => {
  const {
    image_uri,
    name,
    symbol,
    balance: balanceAmount,
    value,
    mint,
    address,
  } = balance;

  const index = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/balances/index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Ensure the server knows you're sending JSON
      },
      body: JSON.stringify({ mint, address }),
    });

    await fetchBalances();
  };

  return (
    <div
      className="grid gap-4 text-sm min-w-[350px] w-fit"
      style={{ gridTemplateColumns: "auto auto 1fr" }}
    >
      <img src={image_uri} alt={name} className="w-10 h-10 rounded-full" />

      <div>
        <div>
          {Number(humanizeTokenAmount(balanceAmount)).toFixed(0)} {symbol}
        </div>

        <div className="text-green-300">{value.toFixed(4)} SOL</div>
      </div>

      <div className="justify-self-end grid justify-items-end">
        <div className="hover:underline cursor-pointer" onClick={() => index()}>
          [refresh]
        </div>

        <Link href={`/${mint}`} className="hover:underline cursor-pointer">
          [view coin]
        </Link>
      </div>
    </div>
  );
};

const AddCoin = ({
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v?: string) => void;
}) => {
  const [mint, setMint] = useState<string>();
  const brand = useBrand();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div className="text-sm hover:underline cursor-pointer w-fit">
          [Add coin]
        </div>
      </DialogTrigger>

      <DialogContent className="bg-primary text-white text-center">
        <div>Add a coin to your portfolio</div>

        <div>Enter the contract address of the coin you want to add</div>

        <Input
          className="bg-transparent text-white outline-none w-full pl-3"
          id="amount"
          placeholder="contract address..."
          value={mint}
          onChange={(e) => setMint(e.target.value)}
        />

        <Button
          onClick={() => onSubmit(mint)}
          className="bg-green-400 text-primary w-full py-3 rounded-md hover:bg-green-200"
        >
          Submit
        </Button>

        <div className="text-xs">
          if your coin is not listed, you can add it by providing the contract
          address address. only coins launched on {brand} are supported.
        </div>
      </DialogContent>
    </Dialog>
  );
};

const LIMIT = 50;
export const Balances = ({ address }: { address: string }) => {
  const { publicKey } = useWallet();
  const [offset, setOffset] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const { balances, fetchBalances } = useBalances({
    address,
    limit: LIMIT,
    offset,
  });

  const addCoin = async (mint?: string) => {
    if (!mint) return;

    await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/balances/index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Ensure the server knows you're sending JSON
      },
      body: JSON.stringify({ mint, address }),
    });

    await fetchBalances();

    setIsOpen(false);
  };

  const isUser = publicKey?.toBase58() === address;

  return (
    <div className="grid justify-items-center gap-4">
      {isUser && (
        <AddCoin
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          onSubmit={(mint?: string) => {
            addCoin(mint);
          }}
        />
      )}

      <div className="grid gap-2">
        {balances.map((balance) => (
          <BalanceView
            balance={balance}
            fetchBalances={fetchBalances}
            key={balance.mint + balance.address}
          />
        ))}
      </div>

      <div className="w-full flex justify-center mt-4">
        <div className="justify-self-end mb-20">
          <div className="flex justify-center space-x-2 text-slate-50">
            <button
              disabled={offset == 0}
              onClick={() => setOffset(offset - LIMIT)}
              className={`text-sm ${
                offset == 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
              }`}
            >
              {"[ << ]"}
            </button>
            <span>{Math.ceil(offset / LIMIT) + 1}</span>
            <button
              disabled={balances?.length % LIMIT !== 0}
              onClick={() => setOffset(offset + LIMIT)}
              className={`text-sm ${
                balances?.length % LIMIT !== 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
              }`}
            >
              {"[ >> ]"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
