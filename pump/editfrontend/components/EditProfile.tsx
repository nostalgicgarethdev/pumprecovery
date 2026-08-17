import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { useProfile } from "@/providers/ProfileProvider";
import { useLocalStorage, useWallet } from "@solana/wallet-adapter-react";
import { Input } from "./ui/input";
import clsx from "clsx";
import { Oval } from "react-loader-spinner";
import { useIsClient } from "@uidotdev/usehooks";

export const EditProfile = ({
  fetchUser: propsFetchUser,
}: {
  fetchUser?: () => Promise<void>;
}) => {
  const isClient = useIsClient();
  const [promptShown, setPromptShown] = useLocalStorage("prompt-shown", false);
  const [isOpen, setIsOpen] = useState(false);
  const { user, loginToken, fetchUser } = useProfile();
  const { publicKey } = useWallet();
  const [username, setUsername] = useState<string>();
  const [profileImage, setProfileImage] = useState<string>();
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageChanged, setProfileImageChanged] = useState(false);
  const fileInputRef = useRef(null);
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleImageChange = (event: any) => {
    const file = event.target.files[0];

    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
      setProfileImageFile(file);
    }
  };

  useEffect(() => {
    if (!isClient) return;

    if (!promptShown) {
      setIsOpen(true);
      setPromptShown(true);
    }
  }, [isClient]);

  useEffect(() => {
    if (!usernameChanged)
      setUsername(user?.username || publicKey?.toBase58().slice(0, 6));
    if (!profileImageChanged)
      setProfileImage(user?.profile_image || "/pepe.png");
  }, [user, publicKey]);

  const submit = async () => {
    setLoading(true);
    setError(undefined);

    let fileUri: string | undefined;
    if (profileImageFile) {
      // upload the file
      const formData = new FormData();
      formData.append("file", profileImageFile as File);
      const res = await fetch("/api/ipfs-file", {
        method: "POST",
        body: formData,
      });

      fileUri = await res.json().then((res) => res.fileUri);
    }

    // send a fetch request to update the user's profile here
    const res = await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
      },
      body: JSON.stringify({
        profileImage: fileUri,
        username,
      }),
    })
      .then((r) => {
        if (!r.ok) throw Error(r.statusText);
        return r.json();
      })
      .catch((e) => {
        setError(e.message);
        return {};
      });

    if (res.error) setError(res.error);

    setUsernameChanged(false);
    setProfileImageChanged(false);
    setProfileImageFile(null);

    propsFetchUser ? propsFetchUser() : fetchUser();
    setLoading(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        setIsOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <div className="flex gap-2 items-center border border-slate-500 rounded px-1 cursor-pointer hover:bg-slate-700">
          Edit profile <Pencil2Icon />
        </div>
      </DialogTrigger>

      <DialogContent className="bg-primary text-white">
        <div className="grid gap-2">
          <div className="font-bold">Edit profile</div>

          <div className="flex gap-4">
            <div>Profile photo</div>
            <div
              className="relative cursor-pointer"
              onClick={() => {
                if (fileInputRef.current) (fileInputRef.current as any).click();
                setProfileImageChanged(true);
              }}
            >
              <img
                src={profileImage}
                className="w-16 h-16 rounded-full border border-slate-500 object-contain"
              />

              <Pencil2Icon className="absolute right-[-6px] bottom-[-6px] h-6 w-6" />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: "none" }} // Hide the input element
                accept="image/*" // Accept images only
              />
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <div>Username</div>

            <Input
              className="bg-transparent text-white outline-none w-full pl-3"
              value={username}
              onChange={(e: any) => {
                setUsername(e.target.value);
                setUsernameChanged(true);
              }}
            />
          </div>

          {!user?.username && (
            <div className="text-xs text-orange-400 justify-self-end">
              You can change your username once every day
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 justify-self-end">{error}</div>
          )}

          <div className="flex gap-2 w-fit justify-self-end">
            <div
              className="text-slate-50 hover:font-bold hover:text-slate-50 cursor-pointer w-fit justify-self-center"
              onClick={() => setIsOpen(false)}
            >
              [close]
            </div>

            <button
              onClick={() => submit()}
              disabled={loading || (!usernameChanged && !profileImageChanged)}
              className={clsx(
                "py-1 px-4 rounded cursor-pointer",
                usernameChanged || profileImageChanged
                  ? "bg-green-600 text-white"
                  : "bg-slate-400 text-black"
              )}
            >
              {loading ? <Oval color="white" height={24} width={24} /> : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
