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

  const fetchReplies = async () => {
    setLoading(true);

    try {
      const query = address ? `user=${address}` : "";

      const replies = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies/${mint}?${query}`
      ).then((r) => r.json());

      replies.forEach((reply: Reply) => {
        const referenceRegex = /#(\d+)/g;
        let match;
        while ((match = referenceRegex.exec(reply.text)) !== null) {
          const referencedId = parseInt(match[1], 10);

          // Find the reply that is referenced and add the current reply's id to its list of sub-replies
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

      setReplies(replies);
    } catch (e) {
      console.error("failed to fetch replies", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [mint, address]);

  return { replies, loading, fetchReplies };
};
