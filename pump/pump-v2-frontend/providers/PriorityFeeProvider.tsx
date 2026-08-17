"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRpcUrl } from "./RpcUrlProvider";

const PriorityFeeContext = createContext<{
  priorityFee: number;
  tipAccounts: string[];
  tipAccount?: string;
}>({
  priorityFee: 0,
  tipAccounts: [],
});

export const usePriorityFee = () => {
  const context = useContext(PriorityFeeContext);

  return context;
};

const DEFAULT_PRIORITY_FEE = 100_000; // micro lamports
const DEFAULT_TIP_AMOUNT = 200_000; // lamports
// Static, public Jito mainnet tip accounts — used as the default so the UI
// never depends on a (CORS-prone) live fetch to have a valid tip destination.
const DEFAULT_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];
export const PriorityFeeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [tipAccounts, setTipAccounts] = useState<string[]>(
    DEFAULT_TIP_ACCOUNTS
  );
  const { rpcUrl } = useRpcUrl();
  const [priorityFee, setPriorityFee] = useState(DEFAULT_PRIORITY_FEE);
  const [tipAmount, setTipAmount] = useState(DEFAULT_TIP_AMOUNT);

  const fetchPriorityFee = async () => {
    try {
      const data = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getPriorityFeeEstimate",
          params: [
            {
              accountKeys: [process.env.NEXT_PUBLIC_PUMP_PROGRAM_ID],
            },
          ],
        }),
      }).then((r) => r.json());

      if (data.error) throw new Error(data.error.message);

      setPriorityFee(
        Math.max(data.result.priorityFeeEstimate || 0, DEFAULT_PRIORITY_FEE)
      );
    } catch (e) {
      console.error("failed to fetch priority fee", e);
    }
  };

  const fetchTipAmount = async () => {};

  const fetchTipAccounts = async () => {
    try {
      // Proxied server-side to avoid browser CORS on block-engine.
      const res = await fetch("/api/jito?action=tipaccounts").then((r) =>
        r.json()
      );
      const accounts = res?.result;
      if (Array.isArray(accounts) && accounts.length > 0) {
        setTipAccounts(accounts);
      }
      // else keep DEFAULT_TIP_ACCOUNTS
    } catch (error) {
      console.error("Error fetching tip accounts (keeping defaults):", error);
    }
  };

  useEffect(() => {
    fetchPriorityFee();
    fetchTipAccounts();
    fetchTipAmount();

    const interval = setInterval(() => {
      fetchPriorityFee();
    }, 15_000);

    return () => clearInterval(interval);
  }, []);

  const tipAccount =
    tipAccounts && tipAccounts.length > 0
      ? tipAccounts[Math.floor(Math.random() * tipAccounts.length)]
      : DEFAULT_TIP_ACCOUNTS[0];

  return (
    <PriorityFeeContext.Provider
      value={{ priorityFee, tipAccounts, tipAccount }}
    >
      {children}
    </PriorityFeeContext.Provider>
  );
};
