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
    if (!token) return true;
    const parts = token.split(".");
    const payloadBase64 = parts[1];
    if (!payloadBase64) return true;
    try {
      const decodedJson = Buffer.from(payloadBase64, "base64").toString();
      const decoded = JSON.parse(decodedJson);
      const exp = decoded.exp;
      const now = Date.now() / 1000;
      return exp < now;
    } catch {
      return true;
    }
  };

  const fetchLikes = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/likes/${id}`
      );
      if (!res.ok) {
        return;
      }
      let likes: any = [];
      try {
        likes = await res.json();
      } catch (jsonErr) {
        console.warn('failed to parse likes json', jsonErr);
        likes = [];
      }

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
