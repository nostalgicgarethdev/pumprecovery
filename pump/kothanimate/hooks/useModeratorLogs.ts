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
  moderator 
}: {
  limit: number;
  offset: number;
  moderator?: string;
}) => {
  const { loginToken } = useProfile();
  const [logs, setLogs] = useState<Log[]>([]);

  const fetchModeratorLogs = async () => {
    let url = `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/moderation/logs?offset=${offset}&limit=${limit}`;
    if (moderator) {
      url = `${url}&moderator=${moderator}`;
    }
    console.log(url)
    const logs = await fetch(
      url,
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
  }, [limit, offset, moderator]);

  return { logs, fetchModeratorLogs };
};
