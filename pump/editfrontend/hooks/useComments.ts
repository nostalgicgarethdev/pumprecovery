import { useEffect, useState } from "react";

export interface Comment {
  signature: string;
  is_confirmed: boolean;
  content: string;
  timestamp: number;
  mint_id: string;
  user_address: string;
  is_buy: boolean;
  sol_amount: number;
  twitter_username: string;
  pfp: string;
}

export const useComments = (mintId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);

  const fetchComments = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/comments/${mintId}`
    ).then((r) => r.json());

    setComments(response.slice().reverse());
  };

  useEffect(() => {
    fetchComments();
  }, [mintId]);

  return { comments, fetchComments };
};
