"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { useEffect, useMemo } from "react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  MathWalletAdapter,
  WalletConnectWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  TokenPocketWalletAdapter,
  CoinbaseWalletAdapter,
  SolongWalletAdapter,
  Coin98WalletAdapter,
  SafePalWalletAdapter,
  BitpieWalletAdapter,
  BitgetWalletAdapter,
  CloverWalletAdapter,
  CoinhubWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import {
  WalletAdapterNetwork,
  isIosAndRedirectable,
} from "@solana/wallet-adapter-base";
import { useIsClient } from "@uidotdev/usehooks";
import { isMobile } from "react-device-detect";
import { useRpcUrl } from "./RpcUrlProvider";
import { getBrand, getBrandOrigin } from "@/lib/brand";

export const SolanaWalletProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isClient = useIsClient();
  const { rpcUrl } = useRpcUrl();

  const endpoint = rpcUrl as string;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new MathWalletAdapter({ endpoint }),
      new TokenPocketWalletAdapter(),
      new CoinbaseWalletAdapter({ endpoint }),
      new SolongWalletAdapter({ endpoint }),
      new Coin98WalletAdapter({ endpoint }),
      new SafePalWalletAdapter({ endpoint }),
      new BitpieWalletAdapter({ endpoint }),
      new BitgetWalletAdapter({ endpoint }),
      new CloverWalletAdapter(),
      new CoinhubWalletAdapter(),
      new WalletConnectWalletAdapter({
        network: WalletAdapterNetwork.Mainnet, // const only, cannot use condition to use dev/main, guess is relative to walletconnect connection init
        options: {
          // projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PJ_ID,
          metadata: {
            name: getBrand(),
            description:
              "Launch a coin that is instantly tradeable without having to seed liquidity. Deploy a coin on Solana for under 2$ in one click.",
            url: `${getBrandOrigin()}/`,
            icons: [`${getBrandOrigin()}/logo.png`],
          },
        },
      }),
    ],
    []
  );

  useEffect(() => {
    if (isIosAndRedirectable() && isMobile) {
      const interval = setInterval(() => {
        localStorage.removeItem("walletName");
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isClient]);

  return (
    <ConnectionProvider endpoint={endpoint as string}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
