import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { useEffect, useState } from "react";

export interface Balance {
  address: string;
  balance: number;
  image_uri: string;
  market_cap: number;
  mint: string;
  name: string;
  symbol: string;
  value: number;
}

export const useBalances = ({
  address,
  limit,
  offset,
}: {
  address: string;
  limit: number;
  offset: number;
}) => {
  const [balances, setBalances] = useState<Balance[]>([]);
  const { ipfsPrefix } = useIpfsPrefix();

  const fetchBalances = async () => {
    const balances = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/balances/${address}?limit=${limit}&offset=${offset}`
    ).then((r) => r.json());

    setBalances(
      balances.map((balance: Balance) => {
        balance.image_uri = balance.image_uri?.replace(
          "https://cf-ipfs.com/ipfs/",
          ipfsPrefix
        );

        return balance;
      })
    );
  };

  useEffect(() => {
    fetchBalances();
  }, [address, limit, offset, ipfsPrefix]);

  return { balances, fetchBalances };
};
