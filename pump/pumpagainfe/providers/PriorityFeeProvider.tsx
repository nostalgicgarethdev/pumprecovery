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
export const PriorityFeeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [tipAccounts, setTipAccounts] = useState<string[]>([]);
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
    const { result: tipAccounts } = await fetch(
      "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTipAccounts",
          params: [],
        }),
      }
    )
      .then((response) => response.json())
      .catch((error) => console.error("Error fetching tip accounts:", error));

    setTipAccounts(tipAccounts);
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
    tipAccounts[Math.floor(Math.random() * tipAccounts.length)];

  return (
    <PriorityFeeContext.Provider
      value={{ priorityFee, tipAccounts, tipAccount }}
    >
      {children}
    </PriorityFeeContext.Provider>
  );
};
