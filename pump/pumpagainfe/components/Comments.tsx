import type { Comment } from "@/hooks/useComments";
import { useComments } from "@/hooks/useComments";
import clsx from "clsx";
import { TwitterUser } from "./TwitterUser";
import { useState } from "react";
import { HeartIcon, HeartFilledIcon } from "@radix-ui/react-icons";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";
import { useLinkedX } from "@/providers/LinkedXProvider";
import { UserPreview } from "./UserPreview";

const CommentComponent = ({ comment }: { comment: Comment }) => {
  const {
    content,
    user_address,
    is_buy,
    sol_amount,
    twitter_username,
    pfp,
  } = comment;

  const [showLikes, setShowLikes] = useState(false);
  // const { username } = useLinkedX();

  // Removed 'loading' from the destructured properties as it's not defined in the hook's return value.
  // const { likes, like, unlike, likedByUser } = useLikes(comment.signature);

  return (
    <div className={clsx("bg-blue-300 p-2 rounded grid gap-2 overflow-auto ")}>
      <div className="flex gap-1 items-center text-sm">

      <a
        className={clsx("hover:underline text-sm")}
        href={`/profile/${user_address}`}
        style={{ color: "black" }}
      >
        {user_address.slice(0, 6)}
      </a>

        <div>
          {is_buy ? "bought" : "sold"} {sol_amount} SOL
        </div>
      </div>

      <div>{content}</div>

      {/* <div className="flex gap-2">
        <div
          className={clsx(
            "flex items-center gap-2 w-fit hover:text-red-700 hover:stroke-red-700 cursor-pointer",
            likedByUser && "text-red-700"
          )}
          onClick={() => (likedByUser ? unlike() : like())}
        >
          {likedByUser ? <HeartFilledIcon /> : <HeartIcon />}
          <div>{likes?.length}</div>
        </div>

        <div
          className="flex gap-1 items-center text-blue-700 hover:underline cursor-pointer text-xs"
          onClick={() => setShowLikes(!showLikes)}
        >
          {showLikes ? (
            <>
              hide likes <ArrowUp className="h-3 w-3" />
            </>
          ) : (
            <>
              view likes <ArrowDown className="h-3 w-3" />
            </>
          )}
        </div>
      </div> */}

      {/* {showLikes && (
        <div className="grid gap-2">
          {username && likes ? (
            likes.map(({ user }, index) => (
              <TwitterUser
                key={index}
                twitter_username={user}
                pfp={pfp}
                address={user_address}
              />
            ))
            
          ) : (
            <div className="italic text-xs">
              Connect your wallet and link your X to view likes
            </div>
          )}
        </div>
      )} */}
    </div>
  );
};

export const Comments = ({ mintId }: { mintId: string }) => {
  const { comments } = useComments(mintId);
  const [index, setIndex] = useState(0);

  if (!comments?.length) return null;

  const comment = comments[index];

  return (
    <div className="grid gap-2 max-w-[350px]">
      <CommentComponent key={comment.signature} comment={comment} />

      <div className="flex justify-between w-full">
        {index > 0 ? (
          <div
            onClick={() => setIndex(index - 1)}
            className="text-slate-50 hover:font-bold hover:text-slate-50 cursor-pointer w-fit justify-self-center"
          >
            [prev comment]
          </div>
        ) : (
          <div />
        )}

        {index < comments.length - 1 && (
          <div
            onClick={() => setIndex(index + 1)}
            className="text-slate-50 hover:font-bold hover:text-slate-50 cursor-pointer w-fit justify-self-center"
          >
            [next comment]
          </div>
        )}
      </div>
    </div>
  );
};