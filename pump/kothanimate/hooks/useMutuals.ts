import { useState, useEffect } from "react";
import { User } from "./useUser";

export function useMutuals(address: string) {
  const [mutuals, setMutuals] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMutuals = async () => {
    if (!address) return;

    setLoading(true);

    const mutuals = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/following/mutuals/${address}`
    )
      .then((r) => r.json())
      .finally(() => setLoading(false));

    setMutuals(mutuals);
  };

  useEffect(() => {
    fetchMutuals();
  }, [address]);

  return { mutuals, fetchMutuals, loading };
}
