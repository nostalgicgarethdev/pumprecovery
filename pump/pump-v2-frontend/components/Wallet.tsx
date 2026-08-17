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
import { useLinkedX } from "@/providers/LinkedXProvider";
import { useSlippage } from "@/hooks/useSlippage";
import { useProfile } from "@/providers/ProfileProvider";
import { Pencil2Icon, TriangleDownIcon } from "@radix-ui/react-icons";
import { useSolBalance } from "@/hooks/useSolBalance";
import { EditProfile } from "./EditProfile";

type WalletProps = {
  stage: number;
  csrfToken: string;
  pfp: string;
  authenticated: boolean;
};

export function Wallet() {
  const [isOpen, setIsOpen] = useLocalStorage("show-wallet", false);
  const { select, wallets, publicKey, disconnect } = useWallet();
  const { loginToken, login, loginLoading, user } = useProfile();
  const { solBalance } = useSolBalance(publicKey?.toBase58());

  // Only show "sign in required" state inside the menu.
  // Do NOT auto-call login() on wallet connect/switch — that causes
  // repeated sign prompts when the user switches wallets.
  const requiresLogin = Boolean(publicKey && !loginToken);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <DialogTrigger asChild>
        {publicKey ? (
          <div className="text-white text-sm grid justify-items-end">
            <div className="flex items-center gap-1 border border-slate-500 rounded px-1 cursor-pointer hover:bg-slate-600">
              <span className="hidden sm:block">
                {Boolean(solBalance) && solBalance && (
                  <>({(solBalance / 10 ** 9).toFixed(2)} SOL)</>
                )}{" "}
              </span>

              <div>
                <img
                  src={user?.profile_image || "/pepe.png"}
                  className="w-4 h-4 rounded-full object-contain"
                />
              </div>

              <div>{user?.username || publicKey.toBase58().slice(0, 6)}</div>

              <TriangleDownIcon />
            </div>
          </div>
        ) : (
          <button className="text-sm text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50">
            [connect wallet]
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-primary text-white text-center">
        <>
          {(() => {
            if (requiresLogin) {
              return (
                <div className="grid gap-4 justify-items-center">
                  <div>Sign in with this wallet to interact</div>

                  {loginLoading ? (
                    <div className="flex gap-4 py-2 px-4 border border-white rounded-full w-fit">
                      <div>Confirm in your wallet</div>
                      <Oval color="white" height={24} width={24} />
                    </div>
                  ) : (
                    <Button
                      className="bg-gray-300 text-primary hover:text-slate-50"
                      onClick={() => login()}
                    >
                      Sign message
                    </Button>
                  )}

                  <div
                    className="text-xs text-slate-400 hover:text-slate-50 cursor-pointer"
                    onClick={() => setIsOpen(false)}
                  >
                    [use without signing in]
                  </div>
                </div>
              );
            }

            if (!publicKey) {
              return (
                <div className="grid gap-4">
                  <div>Connect your wallet</div>

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
                        No wallet found. Please download a supported Solana
                        wallet.
                      </p>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="grid gap-4 justify-center">
                <div className="flex gap-4 items-start">
                  <div>
                    <img
                      src={user?.profile_image || "/pepe.png"}
                      className="w-16 h-16 rounded-full border border-slate-600 object-contain"
                    />
                  </div>

                  <div className="grid justify-items-start gap-1">
                    <div>
                      @{user?.username || publicKey.toBase58().slice(0, 6)}
                    </div>

                    <EditProfile />
                  </div>
                </div>

                <div className="text-xs sm:text-sm border border-white rounded p-2">
                  {publicKey.toBase58()}
                </div>

                <Button
                  className="bg-gray-300 text-primary hover:text-slate-50"
                  onClick={disconnect}
                >
                  Disconnect wallet
                </Button>

                <div
                  className="text-slate-50 hover:font-bold hover:text-slate-50 cursor-pointer w-fit justify-self-center"
                  onClick={() => setIsOpen(false)}
                >
                  [close]
                </div>
              </div>
            );
          })()}
        </>
      </DialogContent>
    </Dialog>
  );
}
