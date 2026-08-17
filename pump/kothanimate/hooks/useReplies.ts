import { useEffect, useState } from "react";

export interface Reply {
  text: string;
  user: string;
  id: number;
  file_uri?: string;
  timestamp: number;
  mint: string;
  mentions?: string[];
  hidden: boolean;
  total_likes: number;
  is_banned?: boolean;
  profile_image?: string;
  username?: string;
  liked_by_user: boolean;
}

export const useReplies = (mint: string, address?: string) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);

  const addOptimisticReply = (partial: Partial<Reply> & { text: string; id?: number }) => {
    const base = {
      id: Date.now(),
      mint,
      user: address || '',
      timestamp: Date.now(),
      total_likes: 0,
      liked_by_user: false,
      hidden: false,
    };
    const optimistic: Reply = {
      ...base,
      ...partial,
    } as Reply;
    if (optimistic.id == null) {
      optimistic.id = Date.now();
    }
    setReplies(prev => [optimistic, ...prev]);
  };

  const fetchReplies = async () => {
    setLoading(true);

    try {
      const query = address ? `user=${address}` : "";

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies/${mint}?${query}`
      );
      if (!res.ok) {
        console.warn('replies fetch bad status', res.status);
        return; // keep optimistic/prev
      }
      let data: any = [];
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.warn('failed to parse replies json', jsonErr);
        data = [];
      }
      if (!Array.isArray(data)) data = [];

      const replies = data;

      replies.forEach((reply: Reply) => {
        const referenceRegex = /#(\d+)/g;
        let match;
        while ((match = referenceRegex.exec(reply.text)) !== null) {
          const referencedId = parseInt(match[1], 10);

          const referencedReply = replies.find(
            (r: Reply) => r.id === referencedId
          );
          if (referencedReply) {
            if (!referencedReply.mentions) referencedReply.mentions = [];

            if (!referencedReply.mentions.includes(reply.id)) {
              referencedReply.mentions.push(reply.id);
            }
          }
        }
      });

      replies.sort((a: Reply, b: Reply) => (b.id || 0) - (a.id || 0));

      setReplies(prev => {
        const highIdThreshold = 1000000000000;
        const now = Date.now();
        const keptOptimistics = prev.filter((r) => {
          const notOnServer = !replies.some((s: Reply) => s.id === r.id);
          const isHigh = (r.id || 0) > highIdThreshold;
          const isRecent = now - ((r.timestamp || 0)) < 60_000;
          return notOnServer && (isHigh || isRecent);
        });
        const merged = keptOptimistics.length ? [...replies, ...keptOptimistics] : replies;
        merged.sort((a: Reply, b: Reply) => (b.id || 0) - (a.id || 0));
        return merged;
      });
    } catch (e) {
      console.error("failed to fetch replies", e);
      // keep list
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [mint, address]);

  return { replies, loading, fetchReplies, addOptimisticReply };
};
