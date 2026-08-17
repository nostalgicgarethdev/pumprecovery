"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import base58 from "bs58";
import { Oval } from "react-loader-spinner";

export default function LinkTg({
  params: { username },
}: {
  params: { username: string };
}) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [signMessageLoading, setSignMessageLoading] = useState(false);
  const { signMessage, publicKey } = useWallet();

  const sign = async () => {
    if (!code) throw Error("Enter a code");
    if (!signMessage) throw Error("Connect your wallet");

    setSignMessageLoading(true);
    try {
      const message = `Sign in with @${username}: ${code}`;
      const encodedSignature = base58.encode(
        await signMessage(new TextEncoder().encode(message))
      );

      const data = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tg-pump-pal/link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: publicKey?.toBase58(),
            signature: encodedSignature,
            message,
          }),
        }
      ).then((response) => response.json());

      if (data.success) setStep(3);
    } catch (e) {
      console.error("Error signing message", e);
    } finally {
      setSignMessageLoading(false);
    }
  };

  return (
    <div className="text-white grid justify-center mt-4">
      {step === 1 && (
        <div className="grid gap-2 justify-items-center">
          <h1>Hello @{username}!</h1>

          <div>Enter your code to link your address to Pump Pal</div>

          <p className="text-xs">
            (The code should have been sent to you from the @PumpPal telegram
            bot)
          </p>

          <input
            className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2 max-w-[200px]"
            id="name"
            placeholder="123-456-789"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <Button
            className="bg-green-600"
            onClick={() => {
              if (!code) return;
              setStep(2);
              if (publicKey) sign();
            }}
          >
            Next
          </Button>

          <p className="text-xs">Step 1 of 2</p>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-2 justify-items-center">
          <div>Sign a message to link address to your account</div>
          {!publicKey && <div className="italic">Connect your wallet</div>}

          {publicKey &&
            (signMessageLoading ? (
              <div className="flex gap-4 py-2 px-4 border border-white rounded-full w-fit">
                <div>Confirm in your wallet</div>
                <Oval color="white" height={24} width={24} />
              </div>
            ) : (
              <Button className="bg-green-600" onClick={() => sign()}>
                Sign message
              </Button>
            ))}

          <Button
            onClick={() => {
              setStep(1);
            }}
          >
            Go back
          </Button>

          <p className="text-xs">Step 2 of 2</p>
        </div>
      )}

      {step === 3 && (
        <div className="grid justify-items-center">
          <div>✅ Successfuly linked your address! ✅</div>
          <div>Go back to telegram to start trading with your friends!</div>
        </div>
      )}
    </div>
  );
}
