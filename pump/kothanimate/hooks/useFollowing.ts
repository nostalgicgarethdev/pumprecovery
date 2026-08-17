import { useProfile } from "@/providers/ProfileProvider";
import { useEffect, useState } from "react";

export const useFollowing = (id: string) => {
  const { address: userAddress, loginToken } = useProfile();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBack, setIsFollowedBack] = useState(false);

  const follow = async () => {
    if (!loginToken) return;
    setIsFollowing(true);
    await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/following/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginToken}`,
      },
    });

    fetchIsFollowing();
  };

  const fetchIsFollowing = async () => {
    if (!id || !userAddress) return;
    const { follow } = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/following/single/${id}?userId=${userAddress}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((r) => r.json());

    setIsFollowing(Boolean(follow));
  };

  const fetchIsFollowedBack = async () => {
    if (!id || !userAddress) return;

    const { follow } = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/following/single/${userAddress}?userId=${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((r) => r.json());

    setIsFollowedBack(Boolean(follow));
  };

  const unfollow = async () => {
    if (!loginToken) return;
    setIsFollowing(false);

    await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/following/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginToken}`,
      },
    });

    fetchIsFollowing();
  };

  useEffect(() => {
    fetchIsFollowing();
    fetchIsFollowedBack();
  }, [id, userAddress]);

  return { fetchIsFollowing, follow, unfollow, isFollowing, isFollowedBack };
};
