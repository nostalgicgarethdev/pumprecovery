import { useProfile } from "@/providers/ProfileProvider";
import { useEffect, useState } from "react";

export interface Notification {
  notification_id: number;
  notification_target_id: number;
  notification_source_user: string;
  notification_message?: string;
  notification_is_read: boolean;
  notification_timestamp: number;
  notification_type: "like" | "mention";
  reply_text: string;
  reply_mint: string;
}

export const useNotifications = ({
  address,
  limit,
  offset,
}: {
  address: string;
  limit: number;
  offset: number;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { loginToken, fetchUser } = useProfile();

  const fetchNotifications = async () => {
    const notifications = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/notifications?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
        },
      }
    ).then((r) => r.json());

    fetchUser();
    setNotifications(notifications);
  };

  useEffect(() => {
    fetchNotifications();
  }, [address]);

  return { notifications, fetchNotifications };
};
