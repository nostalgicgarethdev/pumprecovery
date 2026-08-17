import { useEffect, useState } from "react";
import { Trade } from "./useTrades";

export const useLatestTrade = () => {
  const [latestTrade, setLatestTrade] = useState<Trade>();
  const [loading, setLoading] = useState(false);

  const fetchLatestTrade = async () => {
    setLoading(true);

    const latestTrade = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/trades/latest`
    ).then((r) => r.json());

    setLatestTrade(latestTrade);
    setLoading(false);
  };

  useEffect(() => {
    fetchLatestTrade();
  }, []);

  return { latestTrade, loading, fetchLatestTrade };
};
