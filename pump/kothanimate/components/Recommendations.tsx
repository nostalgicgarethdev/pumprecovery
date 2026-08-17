import { useEffect, useState } from "react";
import { useFollowers } from "@/hooks/useFollowers";
import { UserPreview } from "./UserPreview";
import { useUserFollowing } from "@/hooks/useUserFollowing";
import { useMutuals } from "@/hooks/useMutuals";
import React from "react";
import { useFollowing } from "@/hooks/useFollowing";
import clsx from "clsx";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Oval } from "react-loader-spinner";

interface FollowButtonProps {
  userAddress: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ userAddress }) => {
  const { isFollowing, follow, unfollow } = useFollowing(userAddress);

  return (
    <button
      className={clsx(
        "px-3 rounded-full bg-green-300 border text-sm sm:text-base text-black h-fit",
        isFollowing && "border border-slate-400 bg-slate-800 text-white",
        !isFollowing && "border-transparent"
      )}
      onClick={() => {
        if (isFollowing) {
          unfollow();
        } else {
          follow();
        }
      }}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
};

export const Recommendations = ({ address }: { address: string }) => {
  const { mutuals, fetchMutuals, loading } = useMutuals(address);

  if (!mutuals.length) return null;

  return (
    <div className="grid gap-1 text-white">
      <div className="flex items-center gap-2">
        <div>People you may know</div>
        <button
          className="text-sm p-0 flex gap-1 items-center text-gray-500 hover:underline"
          onClick={() => fetchMutuals()}
          disabled={loading}
        >
          Refresh{" "}
          {loading ? (
            <Oval color="white" height={16} width={16} />
          ) : (
            <ReloadIcon className="w-3 h-3" />
          )}
        </button>
      </div>
      <div className="max-w-screen w-full flex gap-4 overflow-auto">
        {mutuals.map(({ username, profile_image, address, followers }) => (
          <div className="grid gap-2 min-w-[120px] max-w-[200px]" key={address}>
            <div className="grid">
              <UserPreview
                username={username}
                profile_image={profile_image}
                address={address}
              />

              <div className="text-slate-400 whitespace-nowrap">
                {followers || 0} followers
              </div>
            </div>

            <FollowButton userAddress={address} />
          </div>
        ))}
      </div>
    </div>
  );
};
