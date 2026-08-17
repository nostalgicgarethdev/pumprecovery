"use client";

import { createContext, useContext, useEffect, useState } from "react";

const IpfsPrefixContext = createContext({
  ipfsPrefix: "https://ipfs.io/ipfs/",
  findIpfsPrefix: () => {},
} as any);

export const useIpfsPrefix = () => {
  const context = useContext(IpfsPrefixContext);
  return context;
};

const DEFAULT_URL = "https://ipfs.io/ipfs/";
export const IpfsPrefixProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ipfsPrefix, setIpfsPrefix] = useState<string>(DEFAULT_URL);

  const findIpfsPrefix = async () => {
    const testFile = "QmXeG5tTjC63hjTF7a4GcUyetE6yPcsR4rBzX7wb8mmpzg";

    const ipfsPrefixes = [
      "https://ipfs.io/ipfs/",
      "https://gateway.pinata.cloud/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
    ];

    await fetch(`${DEFAULT_URL}${testFile}`)
      .then((r) => r.json())
      .then((v) => {
        setIpfsPrefix(DEFAULT_URL);
      })
      .catch((e) => {
        console.error(e);

        ipfsPrefixes.forEach(async (prefix) => {
          const response = await fetch(`${prefix}${testFile}`).then((r) =>
            r.json()
          );

          if (response?.name) {
            setIpfsPrefix((oldPrefix) => {
              if (oldPrefix !== DEFAULT_URL) return oldPrefix;
              return prefix;
            });
          }
        });
      });
  };

  useEffect(() => {
    findIpfsPrefix();
  }, []);

  return (
    <IpfsPrefixContext.Provider value={{ ipfsPrefix, findIpfsPrefix }}>
      {children}
    </IpfsPrefixContext.Provider>
  );
};
