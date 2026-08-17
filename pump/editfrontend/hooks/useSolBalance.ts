import { useConnection } from "@solana/wallet-adapter-react";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

export const useSolBalance = (address?: string) => {
  const [solBalance, setSolBalance] = useState<number>();
  const { connection } = useConnection();

  // Fetch and log the initial balance
  async function fetchSolBalance() {
    if (!address) return;

    try {
      const balance = await connection.getBalance(new PublicKey(address));
      setSolBalance(balance);
    } catch (error) {
      console.error("Error fetching initial balance:", error);
    }
  }

  useEffect(() => {
    if (!address) return;

    fetchSolBalance();

    const subscriptionId = connection.onAccountChange(
      new PublicKey(address),
      async (accountInfo: AccountInfo<Buffer>) => {
        const newBalance = accountInfo.lamports;
        setSolBalance(newBalance);
      },
      "confirmed"
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [address]);

  return { solBalance, fetchSolBalance };
};
