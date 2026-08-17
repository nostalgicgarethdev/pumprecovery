import { useEffect, useState } from "react";
import { User } from "./useUser";

export const useFollowers = (address: string) => {
  const [followers, setFollowers] = useState<User[]>([]);

  const fetchFollowers = async () => {
    if (!address) return;

    const followers = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/following/followers/${address}`
    ).then((r) => r.json());

    setFollowers(followers);
  };

  useEffect(() => {
    fetchFollowers();
  }, [address]);

  return { followers, fetchFollowers };
};
