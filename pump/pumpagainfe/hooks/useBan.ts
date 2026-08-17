import { useEffect, useState } from "react";

export const useBan = () => {
  const [ban, setBan] = useState<{ expires: number }>();

  const fetchBan = async () => {
    const ban = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies/ban`
    ).then((r) => r.json());

    if (!ban.expires) return;

    setBan(ban);
  };

  useEffect(() => {
    fetchBan();
  }, []);

  return { ban, fetchBan };
};
