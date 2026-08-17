import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Oval } from "react-loader-spinner";
import { useGoogleReCaptcha } from "@google-recaptcha/react";

export const CommentInput = ({
  onSubmit,
  isOpen,
  onOpenChange,
  openCommentModal,
  text,
  children,
  defaultText,
  isTrade,
  ban,
}: {
  ban?: { expires: number };
  onSubmit: (comment?: string, image?: File, token?: string) => void;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  openCommentModal: () => void;
  text?: string;
  children?: React.ReactNode;
  defaultText?: string;
  isTrade?: boolean;
}) => {
  const inputRef = useRef(null);
  const [comment, setComment] = useState(defaultText);
  const [image, setImage] = useState<File>();
  const [loading, setLoading] = useState(false);
  const { executeV3, isLoading: recaptchaLoading } = useGoogleReCaptcha();

  useEffect(() => {
    setComment(defaultText);

    setTimeout(() => {
      const input = inputRef.current as any;
      if (input) {
        const length = input.value.length;
        input.setSelectionRange(length, length);
        input.focus(); // Optionally, bring focus to the input if needed
      }
    }, 200);
  }, [defaultText]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        onOpenChange(v);
        setComment(undefined);
      }}
    >
      {children}

      <DialogContent className="bg-primary text-white">
        {ban && ban.expires > Date.now() ? (
          <div>
            You have been banned from replying because you posted too much spam.
            Your ban expires on {new Date(ban.expires).toLocaleString()}
            <br />
            <br />
            If you think this was a mistake please reach out to us in the
            support chat and we can unban you.
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <label
                className="mb-1 text-sm font-semibold text-blue-400"
                htmlFor="text"
              >
                add a comment
              </label>

              <textarea
                ref={inputRef}
                className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2 h-24"
                id="text"
                placeholder={isTrade ? "(optional)" : "comment"}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              {!isTrade && (
                <div className="flex flex-col">
                  <label
                    className="mb-1 text-sm font-semibold text-blue-400"
                    htmlFor="image"
                  >
                    image (optional)
                  </label>

                  <input
                    className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2 w-full"
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e: any) => setImage(e.target.files[0])}
                  />
                </div>
              )}
            </div>

            {text && <div>{text}</div>}

            <Button
              className="bg-green-400 text-primary w-full py-3 rounded-md hover:bg-green-200"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  let token;
                  if (comment && executeV3) {
                    token = await executeV3("submit");
                  }

                  await onSubmit(comment, image, token);
                  setComment("");
                  setImage(undefined);
                  onOpenChange(false);
                } catch (e) {
                  console.error("Failed to submit comment", e);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? (
                <div className="flex gap-4 items-center">
                  <div>submitting</div>
                  <Oval color="black" height={16} width={16} />
                </div>
              ) : isTrade ? (
                "place trade"
              ) : (
                "post reply"
              )}
            </Button>
          </>
        )}

        <div
          className="text-slate-50 hover:font-bold hover:text-slate-50 cursor-pointer w-fit justify-self-center"
          onClick={() => onOpenChange(false)}
        >
          [cancel]
        </div>
      </DialogContent>
    </Dialog>
  );
};
