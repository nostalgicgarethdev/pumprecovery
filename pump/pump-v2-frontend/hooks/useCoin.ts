import { useEffect, useState } from "react";
import { Coin } from "./useCoins";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";

export const useCoin = (token: string) => {
  const [coin, setCoin] = useState<Coin>();
  const [loading, setLoading] = useState(false);
  const { ipfsPrefix } = useIpfsPrefix();

  const fetchCoin = async (token: string) => {
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/coins/${token}`
      );
      if (!res.ok) {
        console.warn('coins fetch bad status', res.status);
        setLoading(false);
        return;
      }
      const coin = await res.json();

      if (coin.image_uri) {
        coin.image_uri = coin.image_uri.replace(
          "https://cf-ipfs.com/ipfs/",
          ipfsPrefix
        );
      }
      if (coin.metadata_uri) {
        coin.metadata_uri = coin.metadata_uri.replace(
          "https://cf-ipfs.com/ipfs/",
          ipfsPrefix
        );
      }

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
    } catch (e) {
      console.error('failed to fetch coin', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoin(token);
  }, [token, ipfsPrefix]);

  return { coin, loading, fetchCoin };
};
