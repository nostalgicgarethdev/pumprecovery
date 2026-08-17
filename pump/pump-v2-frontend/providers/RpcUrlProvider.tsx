"use client";

import { createContext, useContext, useState } from "react";

const RpcUrlContext = createContext<{ rpcUrl: string }>({
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_API_URL as string,
});

export const useRpcUrl = () => {
  const context = useContext(RpcUrlContext);
  return context;
};

const URLS = [
  process.env.NEXT_PUBLIC_SOLANA_API_URL as string,
  process.env.NEXT_PUBLIC_SOLANA_API_URL2 as string,
  process.env.NEXT_PUBLIC_SOLANA_API_URL3 as string,
  process.env.NEXT_PUBLIC_SOLANA_API_URL4 as string,
  process.env.NEXT_PUBLIC_SOLANA_API_URL5 as string,
  process.env.NEXT_PUBLIC_SOLANA_API_URL6 as string,
  process.env.NEXT_PUBLIC_SOLANA_API_URL7 as string,
  process.env.NEXT_PUBLIC_SOLANA_API_URL8 as string,
  process.env.NEXT_PUBLIC_SOLANA_API_URL9 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL10 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL11 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL12 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL13 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL14 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL15 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL16 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL17 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL18 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL19 as string,
  // process.env.NEXT_PUBLIC_SOLANA_API_URL20 as string,
].filter((v) => v);

export const RpcUrlProvider = ({ children }: { children: React.ReactNode }) => {
  const [rpcUrl, setRpcUrl] = useState(
    URLS[Math.floor(Math.random() * URLS.length)]
  );

  return (
    <RpcUrlContext.Provider value={{ rpcUrl }}>
      {children}
    </RpcUrlContext.Provider>
  );
};
