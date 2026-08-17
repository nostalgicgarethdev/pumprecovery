import { useEffect, useState } from "react";
import { useSocket } from "@/providers/SocketProvider";

export const useTradeUpdates = () => {
  const [latestTrade, setLatestTrade] = useState<any | null>(null);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleTradeCreated = (newTrade: any) => {
      console.log("trade", newTrade);
      setLatestTrade(newTrade);
    };

    socket.on("tradeCreated", handleTradeCreated);

    return () => {
      socket.off("tradeCreated", handleTradeCreated);
    };
  }, [socket]);

  return { latestTrade };
};
