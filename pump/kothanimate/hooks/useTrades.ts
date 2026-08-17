import { useEffect, useState } from "react";

export interface Trade {
  signature: string;
  sol_amount: number;
  token_amount: number;
  is_buy: boolean;
  user: string;
  timestamp: number;
  mint: string;
  symbol?: string;
  image_uri?: string;
  value?: string;
  score?: number;
  username?: string;
  profile_image?: string;
}

export const useTrades = ({
  mint,
  limit,
  offset,
}: {
  mint: string;
  limit: number;
  offset: number;
}) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrades = async () => {
    setLoading(true);

    const trades = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/trades/${mint}?limit=${limit}&offset=${offset}`
    ).then((r) => r.json());

    setTrades(trades);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrades();
  }, [mint, offset, limit]);

  return { trades, loading, fetchTrades };
};
