import { useFollowers } from "@/hooks/useFollowers";
import { UserPreview } from "./UserPreview";
import { useUserFollowing } from "@/hooks/useUserFollowing";

export const Followers = ({
  address,
  fetchFollowing,
}: {
  address: string;
  fetchFollowing?: boolean;
}) => {
  const { followers } = useFollowers(address);
  const { following } = useUserFollowing(address);

  return (
    <div className="w-fit">
      {fetchFollowing
        ? following.map(({ username, profile_image, address, followers }) => (
            <div className="flex gap-2 justify-between w-full" key={address}>
              <UserPreview
                username={username}
                profile_image={profile_image}
                address={address}
              />

              <div className="text-slate-400">{followers || 0} followers</div>
            </div>
          ))
        : followers.map(({ username, profile_image, address, followers }) => (
            <div className="flex gap-2 justify-between w-full" key={address}>
              <UserPreview
                username={username}
                profile_image={profile_image}
                address={address}
              />

              <div className="text-slate-400">{followers || 0} followers</div>
            </div>
          ))}
    </div>
  );
};
