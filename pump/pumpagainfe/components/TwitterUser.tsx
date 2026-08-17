import clsx from "clsx";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useLinkedX } from "@/providers/LinkedXProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const TwitterUser = ({
  twitter_username,
  pfp,
  address,
  small,
  anon,
  color,
  rank,
}: {
  twitter_username: string;
  pfp: string;
  address: string;
  small?: boolean;
  anon?: boolean;
  color?: string;
  rank?: string;
}) => {
  const { username } = useLinkedX();

  const twitterUrl = twitter_username
    ? `https://twitter.com/${twitter_username}`
    : undefined;

  return (
    <div
      className="flex gap-2 items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {twitterUrl && username && !anon && (
        <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
          <Avatar className="w-4 h-4">
            <AvatarImage alt={twitter_username} src={pfp} />
            <AvatarFallback>
              <img
                className="w-full h-full"
                src="https://www.pinclipart.com/picdir/big/184-1843111_pepe-the-frog-crying-png-clipart.png"
                alt={twitter_username || "anon"}
              />
            </AvatarFallback>
          </Avatar>
        </a>
      )}

      {(!twitterUrl || !username || anon) && (
        <Avatar className="w-4 h-4">
          <AvatarImage
            alt={address}
            src={
              "https://www.pinclipart.com/picdir/big/184-1843111_pepe-the-frog-crying-png-clipart.png"
            }
          />
          <AvatarFallback>
            <img
              className="w-full h-full"
              src="https://www.pinclipart.com/picdir/big/184-1843111_pepe-the-frog-crying-png-clipart.png"
              alt={address}
            />
          </AvatarFallback>
        </Avatar>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <a
              className={clsx("hover:underline", small ? "text-xs" : "text-sm")}
              href={username && !anon ? twitterUrl : `/profile/${address}`}
              style={{ color: color }}
            >
              {twitter_username && username && !anon
                ? `@${twitter_username}`
                : address
                ? address.slice(0, 6)
                : "anon"}
            </a>
          </TooltipTrigger>
          <TooltipContent side="top">
            {rank ? `${rank}` : "Rank not available"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
