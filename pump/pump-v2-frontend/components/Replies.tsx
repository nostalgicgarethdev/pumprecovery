import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLikes } from "@/hooks/useLikes";
import { Reply } from "@/hooks/useReplies";
import { useUserReplies } from "@/hooks/useUserReplies";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { useProfile } from "@/providers/ProfileProvider";
import { getPastelColor } from "@/utils/getPastelColor";
import { HeartFilledIcon } from "@radix-ui/react-icons";
import { useWallet } from "@solana/wallet-adapter-react";
import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";

const ReplyView = ({
  reply,
  isAdmin,
  fetchReplies,
}: {
  reply: Reply;
  isAdmin: boolean;
  fetchReplies: () => void;
}) => {
  const { text, user, id, file_uri, timestamp, mint, total_likes } = reply;
  const [expandImage, setExpandImage] = useState(false);
  const { ipfsPrefix } = useIpfsPrefix();
  const { loginToken } = useProfile();

  const clean_file_uri = file_uri?.replace(
    "https://cf-ipfs.com/ipfs/",
    ipfsPrefix
  );

  const toggleHideReply = async (id: number, hidden: boolean) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies/mark-as-hidden/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
        },
        body: JSON.stringify({ hidden }),
      }
    );

    await fetchReplies();
  };

  // Function to split the comment into text and hashtag parts
  const parseComment = (comment: string) => {
    const hashtagRegex = /#(\d+)/g;

    const parts = [];
    let lastIndex = 0;

    comment.replace(hashtagRegex, (match: any, number: any, index: any) => {
      // Push preceding text if there is any
      if (index > lastIndex) {
        parts.push(comment.substring(lastIndex, index));
      }

      // Push the hashtag match
      parts.push(
        <span key={number} className="text-green-300 font-bold">
          #{number}
        </span>
      );

      lastIndex = index + match.length;
      return "";
    });

    // Push any remaining text after the last hashtag
    if (lastIndex < comment.length) {
      parts.push(comment.substring(lastIndex));
    }

    return parts;
  };

  const color = getPastelColor(user.slice(0, 6));

  return (
    <div
      id={"p" + id.toString()}
      className={clsx(
        "bg-[#2e303a] p-1 text-slate-200 text-sm grid gap-1 overflow-auto"
      )}
    >
      <div className="flex gap-2 text-slate-400 text-xs">
        <Link
          className="px-1 rounded text-black hover:underline"
          style={{ backgroundColor: color }}
          href={`/profile/${user}`}
        >
          {user.slice(0, 6)}
        </Link>

        <div>{new Date(timestamp).toLocaleString()}</div>

        <div>#{id}</div>

        {Boolean(total_likes) && (
          <div className="flex gap-1 text-red-500">
            {total_likes}
            <HeartFilledIcon height={16} width={16} />
          </div>
        )}

        <Link
          className="text-green-300 w-fit hover:underline"
          href={`/${mint}`}
        >
          [View thread]
        </Link>
      </div>

      <div
        className={clsx("flex gap-2 items-start", expandImage && "flex-col")}
      >
        {clean_file_uri && (
          <img
            src={clean_file_uri}
            onClick={() => setExpandImage(!expandImage)}
            className={clsx(
              "w-32 object-contain cursor-pointer",
              expandImage && "w-full"
            )}
          />
        )}

        <div>{parseComment(reply.text)}</div>
      </div>

      {isAdmin && (
        <button
          className="p-2 bg-red-400 rounded w-fit"
          onClick={() => toggleHideReply(id, true)}
        >
          Delete
        </button>
      )}
    </div>
  );
};

const LIMIT = 50;
export const Replies = ({ address }: { address: string }) => {
  const [offset, setOffset] = useState(0);
  const { publicKey } = useWallet();
  const { isAdmin } = useIsAdmin(publicKey?.toBase58());
  const { replies, fetchReplies } = useUserReplies({
    limit: LIMIT,
    offset,
    address,
  });

  return (
    <div className="grid gap-2 max-w-[420px]">
      <div>(only you can view your replies)</div>

      {replies.map((reply) => (
        <ReplyView
          key={reply.id}
          reply={reply}
          isAdmin={isAdmin}
          fetchReplies={fetchReplies}
        />
      ))}

      <div className="w-full flex justify-center mt-4">
        <div className="justify-self-end mb-20">
          <div className="flex justify-center space-x-2 text-slate-50">
            <button
              disabled={offset == 0}
              onClick={() => setOffset(offset - LIMIT)}
              className={`text-sm ${
                offset == 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
              }`}
            >
              {"[ << ]"}
            </button>
            <span>{Math.ceil(offset / LIMIT) + 1}</span>
            <button
              disabled={replies?.length % LIMIT !== 0}
              onClick={() => setOffset(offset + LIMIT)}
              className={`text-sm ${
                replies?.length % LIMIT !== 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
              }`}
            >
              {"[ >> ]"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
