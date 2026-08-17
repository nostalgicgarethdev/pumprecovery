"use client";

import { Balances } from "@/components/Balances";
import { CoinsCreated } from "@/components/CoinsCreated";
import { EditProfile } from "@/components/EditProfile";
import { Followers } from "@/components/Followers";
import { Notifications } from "@/components/Notifications";
import { Recommendations, FollowButton } from "@/components/Recommendations";
import { Replies } from "@/components/Replies";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Balance, useBalances } from "@/hooks/useBalances";
import { useFollowing } from "@/hooks/useFollowing";
import { useUser } from "@/hooks/useUser";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { useProfile } from "@/providers/ProfileProvider";
import { humanizeTokenAmount } from "@/utils/humanizeTokenAmount";
import { ChatBubbleIcon, HeartFilledIcon } from "@radix-ui/react-icons";
import { useWallet } from "@solana/wallet-adapter-react";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Profile({ params }: { params: { id: string } }) {
  const { id } = params;
  const { ipfsPrefix } = useIpfsPrefix();
  const { address: userAddress, user: profileUser } = useProfile();
  const [selectedTab, setSelectedTab] = useState("coins held");
  const { user, fetchUser } = useUser(id);
  const { isFollowing, follow, unfollow, isFollowedBack } = useFollowing(
    user?.address || id
  );
  const [showRecommendations, setShowRecommendations] = useState(false);

  const isUser =
    userAddress?.toLowerCase() === id.toLowerCase() ||
    id.toLowerCase() === profileUser?.username?.toLowerCase();

  if (!user && id.length < 20) return null;

  const cleanImageUri = (user?.profile_image || "").replace(
    "https://cf-ipfs.com/ipfs/",
    ipfsPrefix
  );

  return (
    <div className="grid gap-4 text-white mt-8 p-4 justify-items-center">
      <div className="grid gap-1 text-xs sm:text-base">
        <div className="flex gap-4 items-start w-full">
          <div>
            <img
              src={cleanImageUri || "/pepe.png"}
              className="w-16 h-16 rounded-full object-contain"
            />
          </div>

          <div className="grid justify-items-start gap-1 w-full">
            <div className="flex justify-between w-full align-end">
              <div>
                <div>@{user?.username || id.slice(0, 6)}</div>
                <div className="flex gap-2 text-sm items-center">
                  <div>{user?.followers || 0} followers</div>

                  {isFollowedBack && (
                    <div className="text-xs px-1 rounded bg-orange-300 text-black">
                      follows you
                    </div>
                  )}
                </div>
              </div>

              {!isUser && userAddress && (
                <button
                  className={clsx(
                    "px-3 py-1 rounded-full bg-green-300 border text-sm sm:text-base text-black h-fit",
                    isFollowing &&
                      "border border-slate-400 bg-slate-800 text-white",
                    !isFollowing && "border-transparent"
                  )}
                  onClick={() => {
                    if (isFollowing) {
                      unfollow();
                      setShowRecommendations(false); // Hide recommendations after unfollowing
                    } else {
                      follow();
                      // setTimeout()
                      setTimeout(() => setShowRecommendations(true), 500); // Show recommendations after following
                    }
                  }}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
            {user?.bio && (
              <div className="flex gap-2">
                <div className="flex gap-2">
                  <div>{user?.bio}</div>
                </div>
              </div>
            )}

            {isUser && <EditProfile fetchUser={fetchUser} />}

            <div className="flex gap-2 justify-self-start justify-items-start">
              <div className="flex gap-1 text-red-500 items-center text-xs">
                Likes received: {user?.likes_received || 0}
                <HeartFilledIcon height={16} width={16} />
              </div>

              <div className="flex gap-1 text-green-300 items-center text-xs">
                Mentions received: {user?.mentions_received || 0}
                <ChatBubbleIcon height={16} width={16} />
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs sm:text-sm border border-slate-600 rounded p-2">
          {user?.address || id}
        </div>

        <a
          className="hover:underline text-xs justify-self-end w-fit"
          href={`https://solscan.io/account/${user?.address || id}`}
          target="_blank"
          rel="noreferrer"
        >
          View on solscan ↗
        </a>
      </div>
      {showRecommendations && <Recommendations address={userAddress || id} />}
      <div className="flex gap-1 h-fit items-center text-white flex-wrap">
        <div
          onClick={() => setSelectedTab("coins held")}
          className={clsx(
            "cursor-pointer px-1 rounded",
            selectedTab === "coins held" && "bg-green-300 text-black",
            selectedTab !== "coins held" && "hover:bg-gray-800 text-gray-500"
          )}
        >
          coins held
        </div>

        {isUser && (
          <div
            onClick={() => setSelectedTab("replies")}
            className={clsx(
              "cursor-pointer px-1 rounded",
              selectedTab === "replies" && "bg-green-300 text-black",
              selectedTab !== "replies" && "hover:bg-gray-800 text-gray-500"
            )}
          >
            replies
          </div>
        )}

        {isUser && (
          <div
            onClick={() => setSelectedTab("notifications")}
            className={clsx(
              "cursor-pointer px-1 rounded relative",
              selectedTab === "notifications" && "bg-green-300 text-black",
              selectedTab !== "notifications" &&
                "hover:bg-gray-800 text-gray-500"
            )}
          >
            notifications{" "}
            {Boolean(profileUser?.unread_notifs_count) && (
              <div className="text-white bg-red-500 px-1 rounded-full w-fit absolute top-[-8px] right-[-8px] text-xs">
                {profileUser?.unread_notifs_count}
              </div>
            )}
          </div>
        )}

        <div
          onClick={() => setSelectedTab("coins created")}
          className={clsx(
            "cursor-pointer px-1 rounded",
            selectedTab === "coins created" && "bg-green-300 text-black",
            selectedTab !== "coins created" && "hover:bg-gray-800 text-gray-500"
          )}
        >
          coins created
        </div>

        <div
          onClick={() => setSelectedTab("followers")}
          className={clsx(
            "cursor-pointer px-1 rounded",
            selectedTab === "followers" && "bg-green-300 text-black",
            selectedTab !== "followers" && "hover:bg-gray-800 text-gray-500"
          )}
        >
          followers
        </div>

        <div
          onClick={() => setSelectedTab("following")}
          className={clsx(
            "cursor-pointer px-1 rounded",
            selectedTab === "following" && "bg-green-300 text-black",
            selectedTab !== "following" && "hover:bg-gray-800 text-gray-500"
          )}
        >
          following
        </div>
      </div>
      {selectedTab === "coins held" && (
        <Balances address={user?.address || id} />
      )}
      {selectedTab === "replies" && <Replies address={user?.address || id} />}
      {selectedTab === "notifications" && (
        <Notifications address={user?.address || id} />
      )}
      {selectedTab === "coins created" && (
        <CoinsCreated address={user?.address || id} />
      )}
      {selectedTab === "followers" && (
        <Followers address={user?.address || id} />
      )}
      {selectedTab === "following" && (
        <Followers address={user?.address || id} fetchFollowing />
      )}
    </div>
  );
}
