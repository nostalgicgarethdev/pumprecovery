import { useEffect, useState } from "react";
import { Coin } from "./useCoins";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";

export const useCoin = (token: string) => {
  const [coin, setCoin] = useState<Coin>();
  const [loading, setLoading] = useState(false);
  const { ipfsPrefix } = useIpfsPrefix();

  const fetchCoin = async (token: string) => {
    setLoading(true);

    const coin = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/coins/${token}`
    ).then((r) => r.json());

    if (coin.statusCode === 500) {
      setLoading(false);
      return;
    }

    coin.image_uri = coin.image_uri.replace(
      "https://cf-ipfs.com/ipfs/",
      ipfsPrefix
    );

    coin.metadata_uri = coin.metadata_uri.replace(
      "https://cf-ipfs.com/ipfs/",
      ipfsPrefix
    );

    if (coin.twitter && !coin.twitter.startsWith("https://")) {
      coin.twitter = `https://${coin.twitter}`;
    }

    if (coin.telegram && !coin.telegram.startsWith("https://")) {
      coin.telegram = `https://${coin.telegram}`;
    }

    if (coin.website && !coin.website.startsWith("https://")) {
      coin.website = `https://${coin.website}`;
    }

    setCoin(coin);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoin(token);
  }, [token, ipfsPrefix]);

  return { coin, loading, fetchCoin };
};
