"use client";

import { Coin } from "@/hooks/useCoins";
import clsx from "clsx";
import { useState } from "react";
import { CommentInput } from "./CommentInput";
import { useProfile } from "@/providers/ProfileProvider";
import { Reply, useReplies } from "@/hooks/useReplies";
import { getPastelColor } from "@/utils/getPastelColor";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { useToast } from "./ui/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBan } from "@/hooks/useBan";
import Link from "next/link";
import { useLikes } from "@/hooks/useLikes";
import { HeartFilledIcon } from "@radix-ui/react-icons";
import { HeartIcon } from "lucide-react";
import { UserPreview } from "./UserPreview";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const ReplyView = ({
  reply,
  openCommentModal,
  setHoveredId,
  hoveredId,
  isAdmin,
  fetchReplies,
  devAddress,
}: {
  reply: Reply;
  openCommentModal: (replyId: string) => void;
  setHoveredId: (id?: string) => void;
  hoveredId?: string;
  isAdmin: boolean;
  fetchReplies: () => void;
  devAddress: string;
}) => {
  const {
    text,
    user,
    id,
    file_uri,
    timestamp,
    mint,
    mentions,
    total_likes,
    profile_image,
    username,
    liked_by_user,
    signature,
    sol_amount,
    is_buy,
  } = reply;
  const [expandImage, setExpandImage] = useState(false);
  const { ipfsPrefix } = useIpfsPrefix();
  const { loginToken } = useProfile();
  const { likes, like, unlike, likedByUser } = useLikes(id);
  const [animate, setAnimate] = useState(false);
  const clean_file_uri = file_uri?.replace(
    "https://cf-ipfs.com/ipfs/",
    ipfsPrefix
  );

  const toggleHideReply = async (id: number, hidden: boolean) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/moderation/mark-as-hidden/${id}`,
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

  const ban = async (id: number, expires: number) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/moderation/ban/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
        },
        body: JSON.stringify({ expires }),
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
        <a
          href={`#p${number}`}
          key={number}
          className="text-green-300 font-bold hover:underline"
          onMouseEnter={() => setHoveredId(number)}
          onClick={() => setHoveredId(number)}
        >
          #{number}
        </a>
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

  const isLikedByUser =
    typeof likedByUser === "boolean" ? likedByUser : liked_by_user;

  return (
    <div
      id={"p" + (id ?? '').toString()}
      className={clsx(
        "bg-[#2e303a] p-1 text-slate-200 text-sm grid gap-1 overflow-auto",
        hoveredId == (id ?? '').toString() && "bg-green-800",
        animate && "animate-shake"
      )}
    >
      <div className="flex flex-wrap gap-2 text-slate-400 text-xs items-start w-full">
        <UserPreview
          username={username}
          profile_image={profile_image}
          address={user}
          devAddress={devAddress}
          withBackground
        />

        <div>
          {Date.now() - 24 * 60 * 60 * 1000 > timestamp
            ? new Date(timestamp).toLocaleDateString()
            : new Date(timestamp).toLocaleTimeString()}
        </div>

        <div
          className={clsx(
            "flex items-center gap-2 w-fit hover:text-red-500 hover:stroke-red-500 cursor-pointer",
            isLikedByUser && "text-red-500"
          )}
          onClick={() => {
            setAnimate(true);
            setTimeout(() => setAnimate(false), 700);
            isLikedByUser ? unlike() : like();
          }}
        >
          {isLikedByUser ? (
            <HeartFilledIcon height={16} width={16} />
          ) : (
            <HeartIcon height={16} width={16} />
          )}

          <div>{likes ? likes.length : total_likes}</div>
        </div>

        <div
          className="cursor-pointer justify-self-end hover:underline"
          onClick={() => openCommentModal("#" + (id ?? '').toString() + " ")}
        >
          #{id} [reply]
        </div>

        {sol_amount != null && (
          <a
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noreferrer"
            className={clsx(
              "rounded px-1 text-black hover:underline",
              is_buy ? "bg-green-300" : "bg-red-300"
            )}
          >
            {is_buy ? "bought" : "sold"}{" "}
            {(sol_amount / LAMPORTS_PER_SOL).toFixed(4).toString()} SOL
          </a>
        )}
      </div>

      {mentions && (
        <div className="flex gap-1 text-slate-400 text-xs">
          Mentions:{" "}
          {mentions.map((mention) => (
            <a
              href={`#p${mention}`}
              key={mention}
              className="hover:underline text-green-300"
              onClick={() => setHoveredId(mention)}
              onMouseEnter={() => setHoveredId(mention)}
            >
              #{mention}
            </a>
          ))}
        </div>
      )}

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

      <div className="flex gap-2">
        {isAdmin && (
          <button
            className="p-2 bg-red-400 rounded w-fit"
            onClick={() => toggleHideReply(id, true)}
          >
            Delete
          </button>
        )}

        {isAdmin && (
          <button
            className="p-2 bg-orange-400 rounded w-fit"
            onClick={() => ban(id, Date.now() + 4 * 60 * 60 * 1000)}
          >
            Ban
          </button>
        )}
      </div>
    </div>
  );
};

export const Thread = ({ coin }: { coin: Coin }) => {
  const [expandImage, setExpandImage] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const { loginToken, address, login } = useProfile();
  const { publicKey } = useWallet();
  const { replies, fetchReplies, addOptimisticReply } = useReplies(coin.mint, address);
  const [replyId, setReplyId] = useState("");
  const [hoveredId, setHoveredId] = useState<string>();
  const { toastTransaction } = useToast();
  const { isAdmin } = useIsAdmin(address);
  const { ban } = useBan();

  const submitReply = async (comment?: string, image?: File) => {
    if (!comment) return;

    const isTokenExpired = (token: string) => {
      if (!token) return true;
      const parts = token.split(".");
      const payloadBase64 = parts[1];
      if (!payloadBase64) return true;
      try {
        const decodedJson = Buffer.from(payloadBase64, "base64").toString();
        const decoded = JSON.parse(decodedJson);
        const exp = decoded.exp;
        const now = Date.now() / 1000;
        return exp < now;
      } catch {
        return true;
      }
    };

    let token = loginToken;
    if (!token || isTokenExpired(token)) {
      if (publicKey) {
        try {
          await login();
          token = localStorage.getItem("login-token") || "";
        } catch (e) {
          // rejected
        }
      }

      if (!token || isTokenExpired(token)) {
        await toastTransaction({
          title: "Failed to post reply",
          description: "Sign in with your wallet to post",
          status: "error",
        });
        return;
      }
    }

    let fileUri: string | undefined;
    if (image) {
      const formData = new FormData();
      formData.append("file", image as File);
      const res = await fetch("/api/ipfs-file", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        fileUri = data.fileUri;
      }
    }

    const postRes = await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileUri,
        text: comment,
        mint,
      }),
    });

    if (!postRes.ok) {
      const err = await postRes.json().catch(() => ({}));
      console.error('failed to post reply', postRes.status, err);
      if (postRes.status === 401) {
        localStorage.setItem('login-token', '');
      }
      await toastTransaction({
        title: "Failed to post reply",
        description: err.message || "Unauthorized",
        status: "error",
      });
      return;
    }

    const created = await postRes.json().catch(() => null);

    addOptimisticReply({
      text: comment,
      file_uri: fileUri,
      id: created?.id,
      timestamp: created?.timestamp,
      user: created?.user || address || '',
    });

    setTimeout(() => {
      fetchReplies();
    }, 800);
  };

  const {
    name,
    description,
    symbol,
    image_uri,
    mint,
    username,
    profile_image,
    creator,
    created_timestamp,
  } = coin;

  return (
    <div className="text-slate-300 grid gap-1 relative">
      {replies.length > 4 && (
        <div
          className="hover:underline cursor-pointer text-slate-300 w-fit text-sm"
          onClick={() => {
            window.scrollTo(0, document.body.scrollHeight);
          }}
        >
          [scroll to bottom]
        </div>
      )}

      <div className="gap-1 grid h-fit bg-[#2e303a] p-1 text-sm">
        <div className="flex gap-1 text-xs">
          <UserPreview
            username={username}
            profile_image={profile_image}
            address={creator}
            withBackground
            devAddress={creator}
          />

          <div className="text-slate-400">
            {new Date(created_timestamp).toLocaleString()}
          </div>
        </div>

        <div
          className={clsx(
            "relative items-start gap-3 text-slate-300 text-xs overflow-auto",
            expandImage ? "grid" : "flex"
          )}
        >
          <img
            src={image_uri}
            className={clsx(
              "w-32 object-contain cursor-pointer",
              expandImage && "w-full"
            )}
            onClick={() => setExpandImage(!expandImage)}
          />

          <div className="grid">
            <div className="font-bold text-sm">
              {name} (ticker: {symbol})
            </div>

            <div>{description}</div>
          </div>
        </div>
      </div>

      {// display the replies here
      replies.map((reply) => (
        <ReplyView
          key={reply.id}
          reply={reply}
          devAddress={coin.creator}
          isAdmin={isAdmin}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          fetchReplies={fetchReplies}
          openCommentModal={(replyId) => {
            setShowCommentInput(true);
            setReplyId(replyId);
          }}
        />
      ))}

      {replies.length > 4 && (
        <div
          className="hover:underline cursor-pointer text-slate-300 w-fit absolute left-0 bottom-0 text-sm"
          onClick={() => {
            window.scrollTo(0, 0);
          }}
        >
          [scroll to top]
        </div>
      )}

      <CommentInput
        isOpen={showCommentInput}
        onOpenChange={setShowCommentInput}
        openCommentModal={() => setShowCommentInput(true)}
        defaultText={replyId}
        onSubmit={submitReply}
        ban={ban}
      >
        <div
          className="justify-self-center hover:underline cursor-pointer"
          onClick={() => {
            setReplyId("");
            setShowCommentInput(true);
          }}
        >
          [Post a reply]
        </div>
      </CommentInput>
    </div>
  );
};
