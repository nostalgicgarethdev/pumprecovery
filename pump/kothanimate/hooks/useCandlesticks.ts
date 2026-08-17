import { useEffect, useState } from "react";

export interface Candlestick {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
  mint: string;
}

export const useCandlesticks = (mint: string) => {
  const [candlesticks, setCandlesticks] = useState<Candlestick[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCandlesticks = async () => {
    setLoading(true);

    const candlesticks = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/candlesticks/${mint}`
    ).then((r) => r.json());

    setCandlesticks(candlesticks);
    setLoading(false);
  };

  useEffect(() => {
    fetchCandlesticks();
  }, [mint]);

  return { candlesticks, loading };
};
