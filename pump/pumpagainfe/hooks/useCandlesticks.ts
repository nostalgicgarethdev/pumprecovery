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
export const useCandlesticks = (mint: string, tf: string | number) => {
  const [candlesticks, setCandlesticks] = useState<Candlestick[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCandlesticks = async () => {
    setLoading(true);
    // Convert time frame to seconds if it's provided in '5' or '15' minute notations
    if ((tf as string).indexOf('15') !== -1) {
      tf = 15 * 60;
    } else if ((tf as string).indexOf('5') !== -1) {
      tf = 5 * 60;
    }
    else {
      tf = 1;
    }

    // Construct the API URL with the mint and time frame
    const apiUrl = `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/candlesticks/${mint}/${tf.toString()}`;

    // Fetch the candlestick data from the API
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      // Update state with the fetched candlestick data
      setCandlesticks(data);
    } catch (error) {
      console.error("Failed to fetch candlesticks:", error);
      // Handle errors (e.g., network issues, invalid responses) here
    }

    setLoading(false);
  };

  // Re-fetch candlesticks when `mint` or `tf` changes
  useEffect(() => {
    fetchCandlesticks();
  }, [mint, tf]);

  return { candlesticks, loading };
};
