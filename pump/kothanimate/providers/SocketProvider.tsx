"use client";

import { useIsClient } from "@uidotdev/usehooks";
import { createContext, useContext, useMemo } from "react";
import io, { Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const isClient = useIsClient();

  const socket = useMemo(
    () =>
      isClient
        ? io(process.env.NEXT_PUBLIC_CLIENT_API_URL || "", {
            transports: ["websocket"], // Use WebSockets only
          })
        : null,
    [isClient]
  );

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
