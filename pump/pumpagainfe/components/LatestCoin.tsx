import { useLatestCoin } from "@/hooks/useLatestCoin";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";

export const LatestCoin = () => {
  const { latestCoin } = useLatestCoin();
  const { ipfsPrefix } = useIpfsPrefix();

  if (!latestCoin) return null;

  const { creator, symbol, created_timestamp, mint, image_uri } = latestCoin;

  const cleanImageUri = (image_uri || "").replace(
    "https://cf-ipfs.com/ipfs/",
    ipfsPrefix
  );

  const date = new Date(created_timestamp);
  const humanReadableDate = date.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="p-2 rounded flex items-center gap-1 text-sm bg-blue-300">
      <Avatar className="w-4 h-4">
        <AvatarImage
          alt={"anon"}
          src={
            "https://www.pinclipart.com/picdir/big/184-1843111_pepe-the-frog-crying-png-clipart.png"
          }
        />
        <AvatarFallback></AvatarFallback>
      </Avatar>
      <Link href={`/profile/${creator}`}>
        <span className="hover:underline">{creator.slice(0, 6)} </span>
      </Link>
      <span>created </span>
      <Link className="hover:underline flex gap-2" href={`/${mint}`}>
        {symbol}
        <img src={cleanImageUri} className="h-5 w-5 rounded-full" />
      </Link>
      <span> on {humanReadableDate} </span>
    </div>
  );
};
