import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

export interface User {
  likes_received: number;
  address: string;
  unread_notifs_count: number;
  mentions_received: number;
  username?: string;
  profile_image?: string;
  last_username_update_timestamp: number;
  following?: number;
  followers?: number;
}

export const useUser = (id?: string) => {
  const [user, setUser] = useState<User>();

  const fetchUser = async () => {
    if (!id) return;

    const user = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/users/${id}`
    ).then((res) => res.json());

    setUser(user);
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  return { fetchUser, user };
};
