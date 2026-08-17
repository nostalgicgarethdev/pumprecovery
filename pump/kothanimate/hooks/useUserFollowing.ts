import { useEffect, useState } from "react";
import { User } from "./useUser";

export const useUserFollowing = (address: string) => {
  const [following, setFollowing] = useState<User[]>([]);

  const fetchFollowing = async () => {
    if (!address) return;

    const followers = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/following/${address}`
    ).then((r) => r.json());

    setFollowing(followers);
  };

  useEffect(() => {
    fetchFollowing();
  }, [address]);

  return { following, fetchFollowing };
};
