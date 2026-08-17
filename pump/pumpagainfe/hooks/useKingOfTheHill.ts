import { useEffect, useState } from "react";
import { Coin } from "./useCoins";
import { useLocalStorage } from "usehooks-ts";

export const useKingOfTheHill = () => {
  const [includeNsfw] = useLocalStorage("include-nsfw", false);
  const [king, setKing] = useState<Coin>();
  const [loading, setLoading] = useState(false);

  const fetchKingOfTheHill = async () => {
    setLoading(true);

    const king = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/coins/king-of-the-hill?includeNsfw=${includeNsfw}`
    ).then((r) => r.json());

    setKing(king);
    setLoading(false);
  };

  useEffect(() => {
    fetchKingOfTheHill();
  }, [includeNsfw]);

  return { king, loading };
};
