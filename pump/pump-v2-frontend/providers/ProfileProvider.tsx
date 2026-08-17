"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import base58 from "bs58";
import { useWallet } from "@solana/wallet-adapter-react";
import { User, useUser } from "@/hooks/useUser";
import { SIGNIN_BRAND } from "@/lib/brand";

const ProfileContext = createContext<{
  loginToken: string | null;
  login: () => Promise<void>;
  loginLoading: boolean;
  address?: string;
  user?: User;
  fetchUser: () => Promise<void>;
}>({} as any);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  return context;
};

export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginToken, setLoginToken] = useLocalStorage<string>(
    "login-token",
    ""
  );
  const { signMessage, publicKey } = useWallet();
  const [address, setAddress] = useState();
  const { user, fetchUser } = useUser(address);

  const login = async () => {
    if (!signMessage || !publicKey) throw Error("Wallet not connected");
    if (loginLoading) return;

    setLoginLoading(true);

    try {
      const timestamp = Date.now();
      const message = `Sign in to ${SIGNIN_BRAND}: ${timestamp}`;

      const signature = base58.encode(
        await signMessage(new TextEncoder().encode(message))
      );

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: publicKey.toBase58(),
            signature,
            timestamp,
            message,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Login failed: ${res.status} ${text.slice(0, 200)}`);
      }

      const { access_token } = await res.json();
      setLoginToken(access_token);
    } catch (e: any) {
      if (e?.name === 'WalletSignMessageError' || e?.message?.includes('rejected')) {
        console.info('User rejected wallet signature');
      } else {
        console.error("Failed to login", e);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (loginToken) {
      const token = JSON.parse(atob(loginToken.split(".")[1]));

      // if the login token is expired then remove it
      if (token.exp * 1000 < Date.now()) {
        setLoginToken("");
      }

      // if the public key does not match the login token public key then remove the token
      if (publicKey && publicKey.toBase58() !== token.address) {
        setLoginToken("");
      }

      setAddress(token.address);
    }
  }, [loginToken, publicKey]);

  // todo: listen to websocket events for notifs here
  // useEffect(() => {
  //   if (!address) return;

  //   const intervalId = setInterval(() => {
  //     fetchUser();
  //   }, 10_000);

  //   return () => clearInterval(intervalId);
  // }, [address]);

  return (
    <ProfileContext.Provider
      value={{ loginToken, login, loginLoading, address, user, fetchUser }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
