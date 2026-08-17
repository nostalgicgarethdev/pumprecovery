import { useEffect, useState } from "react";
import { Coin } from "./useCoins";

export const useLatestCoin = () => {
  const [latestCoin, setLatestCoin] = useState<Coin>();
  const [loading, setLoading] = useState(false);

  const fetchLatestCoin = async () => {
    setLoading(true);

    const latestCoin = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/coins/latest`
    ).then((r) => r.json());

    setLatestCoin(latestCoin);
    setLoading(false);
  };

  useEffect(() => {
    fetchLatestCoin();
  }, []);

  return { latestCoin, loading, fetchLatestCoin };
};
