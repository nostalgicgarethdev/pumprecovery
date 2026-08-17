import { useToast } from "@/components/ui/use-toast";
import { useProfile } from "@/providers/ProfileProvider";
import { useEffect, useState } from "react";

export interface Like {
  user: string;
  target_id: string;
  id: string;
  timestamp: number;
}

export const useLikes = (id: string | number) => {
  const { address, loginToken } = useProfile();
  const [likes, setLikes] = useState<Like[]>();
  const [likedByUser, setLikedByUser] = useState<boolean>();
  const { toastTransaction } = useToast();

  const isTokenExpired = (token: string) => {
    const payloadBase64 = token.split(".")[1];
    const decodedJson = Buffer.from(payloadBase64, "base64").toString();
    const decoded = JSON.parse(decodedJson);
    const exp = decoded.exp;
    const now = Date.now() / 1000;
    return exp < now;
  };

  const fetchLikes = async () => {
    try {
      const likes = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/likes/${id}`
      ).then((r) => r.json());

      if (typeof likes?.length !== "number") return;

      setLikes(likes);
      setLikedByUser(likes?.some(({ user }: any) => user === address));
    } catch (e) {
      console.error(e);
    }
  };

  const like = async () => {
    if (!loginToken || isTokenExpired(loginToken)) {
      await toastTransaction({
        title: "Failed to like",
        description: "Connect your wallet to like",
        status: "error",
      });

      return;
    }

    setLikedByUser(true);

    await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/likes/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginToken}`,
      },
    });

    fetchLikes();
  };

  const unlike = async () => {
    if (!loginToken || isTokenExpired(loginToken)) {
      await toastTransaction({
        title: "Failed to post reply",
        description: "Connect your wallet to post",
        status: "error",
      });

      return;
    }

    setLikedByUser(false);

    await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/likes/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginToken}`,
      },
    });

    fetchLikes();
  };

  return { likes, fetchLikes, like, unlike, likedByUser: likedByUser };
};
