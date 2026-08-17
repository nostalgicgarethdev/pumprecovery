import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, AccountInfo } from "@solana/web3.js";
import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import BN from "bn.js";

export const useTokenBalance = (mintAddress?: string, address?: string) => {
  const [tokenBalance, setTokenBalance] = useState<number>();
  const [rawTokenBalance, setRawTokenBalance] = useState<BN>();
  const [associatedAddress, setAssociatedAddress] = useState<PublicKey>();
  const { connection } = useConnection();

  const updateAssociatedAddress = async () => {
    if (!mintAddress || !address) return;

    const mintPublicKey = new PublicKey(mintAddress);
    const ownerPublicKey = new PublicKey(address);

    // Find the associated token account for the owner address
    const associatedAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      ownerPublicKey
    );

    setAssociatedAddress(associatedAddress);
  };

  // Fetch and set the token balance
  async function fetchTokenBalance() {
    if (!associatedAddress) return;

    try {
      const balance = await connection.getTokenAccountBalance(
        associatedAddress
      );

      setTokenBalance(balance.value.uiAmount || 0);
      setRawTokenBalance(new BN(balance.value.amount));
    } catch (error) {
      console.error("Error fetching token balance:", error);
    }
  }

  useEffect(() => {
    updateAssociatedAddress();
  }, [address, mintAddress]);

  // Effect to fetch the balance and subscribe to changes
  useEffect(() => {
    if (!associatedAddress) return;

    fetchTokenBalance();

    const subscriptionId = connection.onAccountChange(
      associatedAddress,
      async (accountInfo: AccountInfo<Buffer>) => {
        const info = AccountLayout.decode(accountInfo.data);
        setTokenBalance(Number((info.amount / BigInt(10 ** 6)).toString()));
        setRawTokenBalance(new BN(info.amount.toString()));
      },
      "confirmed"
    );

    // Cleanup subscription on component unmount
    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [associatedAddress]);

  return { tokenBalance, fetchTokenBalance, rawTokenBalance };
};
