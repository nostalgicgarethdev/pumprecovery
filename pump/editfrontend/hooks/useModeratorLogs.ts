import { useProfile } from "@/providers/ProfileProvider";
import { useEffect, useState } from "react";

interface Log {
  description: string;
  timestamp: number;
  moderator: string;
  id: number;
}

export const useModeratorLogs = ({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}) => {
  const { loginToken } = useProfile();
  const [logs, setLogs] = useState<Log[]>([]);

  const fetchModeratorLogs = async () => {
    const logs = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/moderation/logs?offset=${offset}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
        },
      }
    ).then((r) => r.json());

    if (logs.statusCode !== 500) {
      setLogs(logs);
    }
  };

  useEffect(() => {
    fetchModeratorLogs();
  }, [limit, offset]);

  return { logs, fetchModeratorLogs };
};
