"use client";

import {
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { useLocalStorage } from "@uidotdev/usehooks";
import { useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarImage } from "./ui/avatar";
import { useEffect, useState } from "react";
import base58 from "bs58";
import { Oval } from "react-loader-spinner";

export function WalleWithoutAuth() {
  const [isOpen, setIsOpen] = useLocalStorage("show-wallet", false);
  const { select, wallets, publicKey, signMessage, disconnect } = useWallet();

  return (
    <Dialog open={isOpen} onOpenChange={(v) => setIsOpen(v)}>
      <DialogTrigger asChild>
        {publicKey ? (
          <Button className="flex items-center bg bg-transparent hover:font-bold hover:bg-transparent hover:text-slate-50">
            <Avatar className="w-4 h-4">
              <AvatarImage
                alt={"anon"}
                src={
                  "https://www.pinclipart.com/picdir/big/184-1843111_pepe-the-frog-crying-png-clipart.png"
                }
              />
            </Avatar>
            <span className="text-white">
              {publicKey.toBase58().slice(0, 6) + "..."}
            </span>
          </Button>
        ) : (
          <button className="text-sm text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50">
            [connect wallet]
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        className="bg-primary text-white text-center"
        showClose={true}
      >
        <>
          {!publicKey && (
            <div className="grid gap-4">
              <div>connect your wallet</div>

              {wallets.filter(
                (wallet) =>
                  wallet.readyState === "Installed" ||
                  wallet.readyState === "Loadable"
              ).length > 0 ? (
                wallets
                  .filter(
                    (wallet) =>
                      wallet.readyState === "Installed" ||
                      wallet.readyState === "Loadable"
                  )
                  .map((wallet, index) => (
                    <div
                      className="flex justify-center items-center"
                      key={index}
                    >
                      <Button
                        onClick={() => select(wallet.adapter.name)}
                        key={wallet.adapter.name}
                        className="relative w-[180px] bg-[#5c5f66] text-white flex items-center justify-center px-4 py-2 rounded-md"
                      >
                        <Image
                          src={wallet.adapter.icon}
                          alt={wallet.adapter.name}
                          width={24}
                          height={24}
                          className="absolute left-2"
                        />

                        {wallet.adapter.name}
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="flex justify-center items-center">
                  <p>
                    no wallet found. please download a supported solana wallet.
                  </p>
                </div>
              )}
            </div>
          )}

          {publicKey && (
            <div className="grid gap-4 justify-center mt-6">
              <div className="text-sm border border-white rounded p-2">
                {publicKey.toBase58()}
              </div>

              <Button
                className="mx-auto bg-gray-300 text-primary w-2/3 hover:text-slate-50"
                onClick={disconnect}
              >
                disconnect
              </Button>
            </div>
          )}
        </>
      </DialogContent>
    </Dialog>
  );
}
