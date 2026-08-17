import { useEffect, useState } from "react";

export const useIsAdmin = (address?: string) => {
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchIsAdmin = async () => {
    if (!address) return;

    const isAdmin = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/auth/is-admin?address=${address}`
    ).then((r) => r.json());
    setIsAdmin(isAdmin);
  };

  useEffect(() => {
    fetchIsAdmin();
  }, [address]);

  return { isAdmin };
};
