import { useProfile } from "@/providers/ProfileProvider";
import { useEffect, useState } from "react";

export const useFollowingFeed = () => {
  const { address } = useProfile();
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState([]);

  const fetchFeed = async () => {
    if (!address) return;

    setLoading(true);

    try {
      const feed = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/timeline/${address}`
      ).then((res) => res.json());

      setFeed(feed);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [address]);

  return { feed, loading };
};
