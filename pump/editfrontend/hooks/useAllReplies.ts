import { useEffect, useState } from "react";
import { Reply } from "./useReplies";

export const useAllReplies = ({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReplies = async () => {
    setLoading(true);

    try {
      const replies = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies?limit=${limit}&offset=${offset}`
      ).then((r) => r.json());

      setReplies(replies);
    } catch (e) {
      console.error("failed to fetch replies", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [limit, offset]);

  return { replies, loading, fetchReplies };
};
