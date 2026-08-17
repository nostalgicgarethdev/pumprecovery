"use client";

import { useCoins } from "@/hooks/useCoins";
import { useEffect, useState } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import clsx from "clsx";
import { useAllReplies } from "@/hooks/useAllReplies";
import { Input } from "@/components/ui/input";
import { Reply } from "@/hooks/useReplies";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";
import { useBanTerms } from "@/hooks/useBanTerms";
import { Button } from "@/components/ui/button";

const ReplyView = ({
  reply,
  ban,
  toggleHideReply,
}: {
  reply: Reply;
  ban: any;
  toggleHideReply: any;
}) => {
  const { text, file_uri, user, mint, id, hidden, is_banned } = reply;
  const { ipfsPrefix } = useIpfsPrefix();

  const clean_file_uri = file_uri?.replace(ipfsPrefix, "https://ipfs.io/ipfs/");

  return (
    <div className="flex gap-2 border border-slate-400 p-2 w-fit" key={id}>
      <div>
        {hidden && <div className="text-red-400">[Deleted]</div>}
        {is_banned && <div className="text-orange-400">[User Banned]</div>}
      </div>

      {clean_file_uri && <img src={clean_file_uri} className="h-20" />}
      <div>
        <div className="text-sm font-bold">{user.slice(0, 6)}</div>
        <div className="text-xs text-slate-300">{text}</div>
      </div>

      <button
        className="p-2 bg-red-400 rounded"
        onClick={() => toggleHideReply(id, true)}
      >
        Delete
      </button>

      <button
        className="p-2 bg-blue-400 rounded"
        onClick={() => toggleHideReply(id, false)}
      >
        Undelete
      </button>

      <button
        className="p-2 bg-green-400 rounded"
        onClick={() => {
          window.open(`/${mint}`);
        }}
      >
        View thread
      </button>

      <button
        className="p-2 bg-red-400 rounded"
        onClick={() => {
          const expires = Date.now() + 4 * 60 * 60 * 1000;
          ban(id, expires);
        }}
      >
        Ban
      </button>

      <button
        className="p-2 bg-blue-400 rounded"
        onClick={() => {
          ban(id, 0);
        }}
      >
        Unban
      </button>

      <button
        className="p-2 bg-orange-400 rounded"
        onClick={() => {
          const expires = Date.now() + 5 * 24 * 60 * 60 * 1000;
          ban(id, expires);
        }}
      >
        PERMANENT BAN
      </button>
    </div>
  );
};

const LIMIT = 50;
export default function Moderation() {
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const { loginToken } = useProfile();
  const [selectedTab, setSelectedTab] = useState("coins");
  const {
    banTerms,
    fetchBanTerms,
    createBanTerm,
    deleteBanTerm,
  } = useBanTerms();
  const [banTerm, setBanTerm] = useState<string>();

  const { replies, fetchReplies } = useAllReplies({ limit: LIMIT, offset });
  const { coins, setCoins, fetchCoins } = useCoins({
    sort: "created_timestamp",
    order: "desc",
    offset,
    limit: LIMIT,
    searchTerm,
    includeNsfw: true,
  });

  const toggleNsfw = async (mint: string, nsfw: boolean) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/coins/mark-as-nsfw/${mint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
        },
        body: JSON.stringify({ nsfw }),
      }
    );

    await fetchCoins();
  };

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

  const ban = async (id: number, expires: number) => {
    await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies/ban/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
      },
      body: JSON.stringify({ expires }),
    });

    await fetchReplies();
  };

  return (
    <div className="grid gap-2 p-4">
      <div className="flex gap-1 h-fit items-center text-white">
        <div
          onClick={() => {
            setSelectedTab("coins");
            setOffset(0);
          }}
          className={clsx(
            "cursor-pointer px-1 rounded",
            selectedTab === "coins" && "bg-green-300 text-black",
            selectedTab !== "coins" && "hover:bg-gray-800 text-gray-500"
          )}
        >
          Coins
        </div>

        <div
          onClick={() => {
            setSelectedTab("replies");
            setOffset(0);
          }}
          className={clsx(
            "cursor-pointer px-1 rounded",
            selectedTab === "replies" && "bg-green-300 text-black",
            selectedTab !== "replies" && "hover:bg-gray-800 text-gray-500"
          )}
        >
          Replies
        </div>

        <div
          onClick={() => {
            setSelectedTab("banned terms");
            setOffset(0);
          }}
          className={clsx(
            "cursor-pointer px-1 rounded",
            selectedTab === "banned terms" && "bg-green-300 text-black",
            selectedTab !== "banned terms" && "hover:bg-gray-800 text-gray-500"
          )}
        >
          banned terms
        </div>
      </div>

      <div className="w-full grid justify-items-center px-2 sm:p-0">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="search for token"
          className="p-2 border border-gray-300 w-full max-w-[470px] bg-green-300 text-black border-none focus:border-none active:border-none"
        />
      </div>

      <div className="grid gap-4 text-white p-2">
        {selectedTab === "coins" &&
          coins.map(
            ({
              name,
              symbol,
              description,
              reply_count,
              nsfw,
              image_uri,
              mint,
            }) => (
              <div className="border border-slate-500 p-2 w-fit" key={mint}>
                <div className="min-w-32">
                  <img
                    className="mr-4 w-32 h-auto"
                    src={image_uri}
                    alt={name}
                  />
                </div>

                <p className="text-xs flex items-center gap-2">
                  replies: {reply_count || 0}
                  {nsfw && <span className="text-red-400">[NSFW]</span>}
                </p>

                <p
                  className="text-sm w-full"
                  style={{
                    overflowWrap: "break-word",
                    wordBreak: "break-all",
                  }}
                >
                  <span className="font-bold">
                    {name} (ticker: {symbol}):{" "}
                  </span>
                  {description}
                </p>

                <button
                  className="p-2 bg-red-400 rounded mr-2"
                  onClick={() => toggleNsfw(mint, true)}
                >
                  Mark as NSFW
                </button>

                <button
                  className="p-2 bg-blue-400 rounded"
                  onClick={() => toggleNsfw(mint, false)}
                >
                  Mark as SFW
                </button>
              </div>
            )
          )}

        {selectedTab === "replies" &&
          replies.map((reply) => (
            <ReplyView
              reply={reply}
              key={reply.id}
              toggleHideReply={toggleHideReply}
              ban={ban}
            />
          ))}

        {selectedTab === "banned terms" && (
          <div>
            <div className="flex gap-2 w-fit">
              <Input
                className="text-black"
                value={banTerm}
                onChange={(e) => {
                  console.log("hello", e.target.value);
                  setBanTerm(e.target.value);
                }}
                placeholder="add ban term"
              />

              <Button
                onClick={() => {
                  if (!banTerm) return;
                  createBanTerm(banTerm);
                  setBanTerm(undefined);
                }}
              >
                Add term
              </Button>
            </div>

            <div className="grid gap-2">
              {banTerms.map(({ term, id }) => (
                <div key={id} className="flex gap-2 items-center">
                  {term}

                  <Button
                    className="bg-green-500"
                    onClick={() => deleteBanTerm(id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
              disabled={coins?.length % LIMIT !== 0}
              onClick={() => setOffset(offset + LIMIT)}
              className={`text-sm ${
                coins?.length % LIMIT !== 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
              }`}
            >
              {"[ >> ]"}
            </button>

            <button
              onClick={() => setOffset(offset + LIMIT * 5)}
              className={`text-sm ${"text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"}`}
            >
              {"[next 5 pages]"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
