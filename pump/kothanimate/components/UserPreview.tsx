import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { getPastelColor } from "@/utils/getPastelColor";
import clsx from "clsx";
import Link from "next/link";

export const UserPreview = ({
  username,
  profile_image,
  address,
  devAddress,
  withBackground,
}: {
  username?: string;
  profile_image?: string;
  address: string;
  devAddress?: string;
  withBackground?: boolean;
}) => {
  const { ipfsPrefix } = useIpfsPrefix();
  const clean_profile_image_uri = profile_image?.replace(
    "https://cf-ipfs.com/ipfs/",
    ipfsPrefix
  );

  const color = getPastelColor(address?.slice(0, 6) || "anon");
  return (
    <Link href={`/profile/${username || address}`}>
      <div className="flex gap-1  items-center">
        <img
          src={clean_profile_image_uri || "/pepe.png"}
          className="w-4 h-4 rounded"
        />

        <div
          className={clsx(
            "px-1 rounded hover:underline flex gap-1",
            withBackground && "text-black"
          )}
          style={{
            backgroundColor: withBackground ? color : "transparent",
          }}
        >
          {username || address?.slice(0, 6) || "anon"}{" "}
          {devAddress &&
            address.toLowerCase() === devAddress.toLowerCase() &&
            "(dev)"}
        </div>
      </div>
    </Link>
  );
};
