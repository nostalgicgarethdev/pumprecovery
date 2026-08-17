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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies?limit=${limit}&offset=${offset}`
      );
      if (!res.ok) {
        setReplies([]);
        return;
      }
      let replies: any = [];
      try {
        replies = await res.json();
      } catch (jsonErr) {
        console.warn('failed to parse replies json', jsonErr);
        replies = [];
      }
      setReplies(Array.isArray(replies) ? replies : []);
    } catch (e) {
      console.error("failed to fetch replies", e);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [limit, offset]);

  return { replies, loading, fetchReplies };
};
