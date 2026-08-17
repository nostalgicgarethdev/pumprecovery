"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import React, { useState, useEffect } from "react";
import base58 from "bs58";

const LinkedXContext = React.createContext({} as any);

export const useLinkedX = () => {
  const context = React.useContext(LinkedXContext);

  return context;
};

export const LinkedXProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [csrfToken, setCsrfToken] = useState<string>();
  const [username, setUsername] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [pfp, setPfp] = useState("");
  const { select, wallets, publicKey, signMessage, disconnect } = useWallet();
  const [signMessageLoading, setSignMessageLoading] = useState(false);
  const [addressLinked, setAddressLinked] = useState(false);
  const [unlinkError, setUnlinkError] = useState("");

  // check if jwt exists
  const checkAuth = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/username`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAuthenticated(true);
        setPfp(data.pfp);
        setUsername(data.username);
      } else {
        setAuthenticated(false);
        setPfp("");
        setUsername(null);
        setAddressLinked(false);
      }
    } catch (error) {
      console.error("User is not authenticated", error);
      setAuthenticated(false);
      setPfp("");
      setUsername(null);
      setAddressLinked(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      const id =
        Math.random()
          .toString(36)
          .substring(2, 15) +
        Math.random()
          .toString(36)
          .substring(2, 15);

      const { csrfToken } = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/social-auth/initiate?id=${id}`,
        {}
      ).then((r) => r.json());

      if (csrfToken) {
        setCsrfToken(csrfToken);
      }
    };

    fetchCsrfToken();
  }, []);

  useEffect(() => {
    if (publicKey && authenticated) {
      sign();
    }

    if (!publicKey) {
      setAddressLinked(false);
    }
  }, [publicKey?.toBase58(), authenticated]);

  async function sign() {
    try {
      setAddressLinked(false);
      setSignMessageLoading(true);

      if (!signMessage) throw Error("Wallet not connected");
      if (!publicKey) throw Error("No public key");

      // Fetch the user verification status
      const { isVerified } = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/messages/user/${publicKey.toBase58()}`,
        {
          method: "GET",
          credentials: "include",
        }
      ).then((r) => r.json());

      if (isVerified) {
        setSignMessageLoading(false);
        setAddressLinked(true);
        return;
      }

      const { msg, id } = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages`,
        {
          method: "GET",
          credentials: "include",
        }
      ).then((r) => r.json());

      const encodedSignature = base58.encode(
        await signMessage(new TextEncoder().encode(msg))
      );

      const { success } = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            message_id: id,
            address: publicKey ? publicKey.toBase58() : null,
            signature: encodedSignature,
            twitter_username: username,
          }),
        }
      ).then((r) => r.json());

      setSignMessageLoading(false);
      setAddressLinked(success);
    } catch (e) {
      console.log("Could not sign message");
    } finally {
      setSignMessageLoading(false);
    }
  }

  const unlink = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/unlink`,
        {
          credentials: "include",
        }
      ).then((r) => r.json());

      if (res.success) {
        await checkAuth();
      } else {
        setUnlinkError(res.message);
      }
    } catch (e) {
      console.log("Could not unlink address");
    }
  };

  return (
    <LinkedXContext.Provider
      value={{
        csrfToken,
        username,
        authenticated,
        pfp,
        signMessageLoading,
        addressLinked,
        unlinkError,
        checkAuth,
        sign,
        unlink,
      }}
    >
      {children}
    </LinkedXContext.Provider>
  );
};
