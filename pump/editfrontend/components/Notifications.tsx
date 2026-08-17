import { Notification, useNotifications } from "@/hooks/useNotifications";
import { ChatBubbleIcon, HeartFilledIcon, PersonIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";

const LikeNotificationView = ({
  notification,
}: {
  notification: Notification;
}) => {
  const { notification_message, reply_text, reply_mint } = notification;

  return (
    <Link
      href={`/${reply_mint}`}
      className="flex gap-2 items-start border-b border-slate-700 py-2 overflow-auto hover:bg-slate-800 cursor-pointer"
    >
      <div className="text-red-500 mt-1">
        <HeartFilledIcon height={20} width={20} />
      </div>

      <div>
        <div>{notification_message}</div>
        <div>{reply_text}</div>
      </div>
    </Link>
  );
};

const FollowNotificationView = ({
  notification,
}: {
  notification: Notification;
}) => {
  const { notification_message, source_user: follower_profile } = notification;
  return (
    <Link href={`/profile/${follower_profile}`}
    className="flex gap-2 items-start border-b border-slate-700 py-2 overflow-auto hover:bg-slate-800 cursor-pointer"
    >
      <div className="text-blue-300 mt-1">
        <PersonIcon height={20} width={20} />
      </div>

      <div>
        <div>{notification_message}</div>
      </div>

    </Link>
  );
};
const MentionNotificationView = ({
  notification,
}: {
  notification: Notification;
}) => {
  const { notification_message, reply_text, reply_mint } = notification;

  return (
    <Link
      href={`/${reply_mint}`}
      className="flex gap-2 items-start border-b border-slate-700 py-2 overflow-auto hover:bg-slate-800 cursor-pointer"
    >
      <div className="text-green-300 mt-1">
        <ChatBubbleIcon height={20} width={20} />
      </div>

      <div>
        <div>{notification_message}</div>
        <div>{reply_text}</div>
      </div>
    </Link>
  );
};

const LIMIT = 50;
export const Notifications = ({ address }: { address: string }) => {
  const [offset, setOffset] = useState(0);
  const { notifications } = useNotifications({ address, offset, limit: LIMIT });

  return (
    <div className="grid max-w-[90vw] w-[400px]">
      {notifications.map((notification) =>
        notification.notification_type === "like" ? (
          <LikeNotificationView
            notification={notification}
            key={notification.notification_id}
          />
        ) : notification.notification_type === "mention" ? (
          <MentionNotificationView
            notification={notification}
            key={notification.notification_id}
          />
        ) : (
          <FollowNotificationView
            notification={notification}
            key={notification.notification_id}
          />
        )
      )}
    </div>
  );
};
