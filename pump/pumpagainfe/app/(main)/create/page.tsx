"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { AnchorProvider, BN, Idl, Program, utils } from "@coral-xyz/anchor";
import pumpIdl from "../../../idl/pump.json";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { useToast } from "@/components/ui/use-toast";
import { Oval } from "react-loader-spinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { useGlobal } from "@/hooks/useGlobal";
import { usePriorityFee } from "@/providers/PriorityFeeProvider";
import { sendTransaction } from "@/utils/sendTransaction";

const CreateButton = ({
  symbol,
  name,
  image,
  create,
  validate,
}: {
  symbol: string;
  name: string;
  image: File;
  create: any;
  validate: any;
}) => {
  const [loading, setLoading] = useState(false);
  const [nativeSelected, setNativeSelected] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [solAmount, setSolAmount] = useState<number>();
  const [amount, setAmount] = useState<number>();
  const [error, setError] = useState<string>();
  const { global } = useGlobal();

  const getFee = (solAmount: BN) => {
    if (!global) return new BN(0);

    return solAmount.mul(global.feeBasisPoints).div(new BN(10_000));
  };

  const buyQuote = (amount: BN, solBuy: boolean) => {
    if (amount.eq(new BN(0))) return new BN(0);
    if (!global) return new BN(0);

    const {
      initialVirtualSolReserves,
      initialVirtualTokenReserves,
      initialRealTokenReserves,
    } = global;

    let solCost: BN;
    let tokensReceived: BN;

    if (solBuy) {
      const k = initialVirtualSolReserves.mul(initialVirtualTokenReserves);

      const newVirtualSolReserves = initialVirtualSolReserves.add(amount);
      const newVirtualTokenReserves = k
        .div(newVirtualSolReserves)
        .add(new BN(1));

      tokensReceived = initialVirtualTokenReserves.sub(newVirtualTokenReserves);
      tokensReceived = BN.min(tokensReceived, initialRealTokenReserves);
      solCost = amount;
    } else {
      amount = BN.min(amount, initialRealTokenReserves);
      solCost = amount
        .mul(initialVirtualSolReserves)
        .div(initialVirtualTokenReserves.sub(amount))
        .add(new BN(1));
      tokensReceived = amount;
    }

    const fee = getFee(solCost);
    return solBuy ? tokensReceived : solCost.add(fee);
  };

  const handleSolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSolAmount = parseFloat(e.target.value);
    if (isNaN(newSolAmount)) {
      setSolAmount(("" as any) as number);
      setAmount(("" as any) as number);
      return;
    }
    setSolAmount(newSolAmount);

    const solAmountInLamports = new BN(Math.floor(newSolAmount * 10 ** 9));
    const tokenAmountReceived = buyQuote(solAmountInLamports, true);
    const tokenAmountNumber = tokenAmountReceived.toNumber() / 10 ** 6;

    setAmount(tokenAmountNumber);
  };

  const handleTokenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTokenAmount = parseFloat(e.target.value);
    if (isNaN(newTokenAmount)) {
      setAmount(("" as any) as number);
      setSolAmount(("" as any) as number);
      return;
    }
    setAmount(newTokenAmount);
    const tokenAmountBN = new BN(newTokenAmount * 10 ** 6);

    let solAmountRequiredLamports;
    solAmountRequiredLamports = buyQuote(tokenAmountBN, false);

    const solAmountInSol = lamportsToSol(solAmountRequiredLamports);
    setSolAmount(solAmountInSol);
  };

  const createSubmit = async () => {
    setLoading(true);
    setError(undefined);

    try {
      let tokensToBuy;
      let solRequired;

      const parsedAmount = nativeSelected
        ? new BN(Math.floor((solAmount || 0) * 10 ** 9))
        : new BN(Math.floor(amount || 0).toString()).mul(new BN("1000000"));

      if (nativeSelected) {
        tokensToBuy = buyQuote(parsedAmount, true);
        solRequired = parsedAmount;

        if (!global) return;
        const fee = solRequired.mul(global.feeBasisPoints).div(new BN(10_000));
        solRequired = solRequired.add(fee);
      } else {
        solRequired = buyQuote(parsedAmount, false);
        tokensToBuy = parsedAmount;
      }

      const buyParams = {
        amount: tokensToBuy,
        solAmount: solRequired,
      };

      await create(buyParams);

      setIsOpen(false);
      setAmount(undefined);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("an unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => setIsOpen(v)}>
      <Button
        className="bg-[#0d6efd]"
        disabled={loading}
        onClick={() => {
          validate();
          setIsOpen(true);
          setError(undefined);
        }}
      >
        Create coin
      </Button>

      <DialogContent className="bg-primary text-white text-center max-w-[400px]">
        <div className="grid gap-3">
          <div>Choose how many [{symbol}] you want to buy (optional)</div>

          <div className="text-xs">
            tip: its optional but buying a small amount of coins helps protect
            your coin from snipers
          </div>

          <button
            onClick={() => setNativeSelected(!nativeSelected)}
            className={`text-xs py-1 px-2 rounded w-fit justify-self-end bg-primary text-gray-400 hover:bg-gray-800 hover:text-gray-300`}
          >
            switch to {nativeSelected ? symbol : "SOL"}
          </button>

          <div className="flex items-center rounded-md relative bg-[#2e303a]">
            <Input
              className="bg-transparent text-white outline-none w-full pl-3"
              id="amount"
              placeholder="0.0 (optional)"
              type="number"
              value={nativeSelected ? solAmount : amount}
              onChange={
                nativeSelected ? handleSolInputChange : handleTokenInputChange
              }
            />
            <div className="flex items-center ml-2 absolute right-2">
              <span className="text-white mr-2">
                {nativeSelected ? "SOL" : symbol}
              </span>
              <img
                className="w-8 h-8 rounded-full"
                alt={nativeSelected ? "SOL" : name}
                src={
                  nativeSelected
                    ? "https://www.liblogo.com/img-logo/so2809s56c-solana-logo-solana-crypto-logo-png-file-png-all.png"
                    : image && URL.createObjectURL(image)
                }
              />
            </div>
          </div>

          {Boolean(amount || solAmount) && (
            <div className="text-sm text-gray-400 w-fit justify-self-start">
              {nativeSelected
                ? `You receive: ${amount || 0} ${symbol}`
                : `Cost: ${solAmount || 0} SOL`}
            </div>
          )}

          <Button
            className="bg-[#0d6efd]"
            onClick={() => createSubmit()}
            disabled={loading}
          >
            {loading ? (
              <Oval color="white" height={24} width={24} />
            ) : (
              "Create coin"
            )}
          </Button>

          <div className="text-xs">Cost to deploy: ~0.02 SOL</div>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          {loading && "May take a few seconds to upload image data..."}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function Create() {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File>();
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { signTransaction, publicKey } = useWallet();
  const { toastTransaction, toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showName, setShowName] = useState(true);
  const { global } = useGlobal();
  const { priorityFee, tipAccount } = usePriorityFee();

  const handleImageUpload = (files: any) => {
    setImage(files[0]);
  };

  const validate = () => {
    try {
      setError(undefined);

      if (name.length > 32)
        throw Error("name too long: it must be less than 32 characters");
      if (!name) throw Error("no name");
      if (!image) throw Error("no image uploaded");
      if (!wallet) throw Error("wallet not connected");
      if (!ticker) throw Error("no ticker");
      if (ticker.length > 10)
        throw Error("ticker must be less than 11 characters");
      if (description && description.length > 2_000)
        throw Error("description too long");
      if (image.size > 4_500_000)
        throw Error("image too large: it must be less than 4.3 megabytes");
      if (description.length > 5_000) throw Error("description too long");
    } catch (e) {
      setError((e as any).message as string);
      throw Error((e as any).message);
    }
  };

  const create = async (buyParams: { amount: BN; solAmount: BN }) => {
    try {
      setLoading(true);
      setError(undefined);
      if (!global) return;

      if (name.length > 32)
        throw Error("name too long: it must be less than 32 characters");
      if (!image) throw Error("no image uploaded");
      if (!wallet) throw Error("wallet not connected");
      if (!ticker) throw Error("no ticker");
      if (description && description.length > 2_000)
        throw Error("description too long");
      if (!signTransaction) return;
      if (!publicKey) return;

      // upload the metadata
      const formData = new FormData();
      formData.append("file", image as File);
      formData.append("name", name);
      formData.append("symbol", ticker);
      formData.append("description", description);
      formData.append("twitter", twitter);
      formData.append("telegram", telegram);
      formData.append("website", website);
      formData.append("showName", showName.toString());
      const res = await fetch("/api/ipfs", {
        method: "POST",
        body: formData,
      });
      const { metadataUri } = await res.json();

      // create token with metadata link
      const anchorProvider = new AnchorProvider(connection, wallet, {});
      const pumpProgram = new Program(
        pumpIdl as unknown as Idl,
        new PublicKey(process.env.NEXT_PUBLIC_PUMP_PROGRAM_ID as string),
        anchorProvider
      );

      const mintKeyPair = Keypair.generate();
      const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("mint-authority")],
        pumpProgram.programId
      );
      const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
        [
          utils.bytes.utf8.encode("bonding-curve"),
          mintKeyPair.publicKey.toBuffer(),
        ],
        pumpProgram.programId
      );
      const associatedBondingCurveAccount = getAssociatedTokenAddressSync(
        mintKeyPair.publicKey,
        bondingCurvePDA,
        true
      );
      const mplTokenMetadata = new PublicKey(
        MPL_TOKEN_METADATA_PROGRAM_ID.toString()
      );
      const [globalPDA] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("global")],
        pumpProgram.programId
      );
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          utils.bytes.utf8.encode("metadata"),
          mplTokenMetadata.toBuffer(),
          mintKeyPair.publicKey.toBuffer(),
        ],
        mplTokenMetadata
      );

      const instructions: TransactionInstruction[] = [];

      const createInstruction = await pumpProgram.methods
        .create(name, ticker, metadataUri)
        .accounts({
          mint: mintKeyPair.publicKey,
          mintAuthority: mintAuthorityPDA,
          bondingCurve: bondingCurvePDA,
          associatedBondingCurve: associatedBondingCurveAccount,
          global: globalPDA,
        })
        .signers([mintKeyPair])
        .instruction();

      instructions.push(createInstruction);

      if (buyParams.amount.gt(new BN(0))) {
        const associatedUser = getAssociatedTokenAddressSync(
          mintKeyPair.publicKey,
          wallet.publicKey,
          false
        );

        const userTokenAccount = await getAccount(
          connection,
          associatedUser
        ).catch((e) => null);

        // if user account doesnt exist add an instruction to create it
        if (!userTokenAccount) {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              associatedUser,
              wallet.publicKey,
              mintKeyPair.publicKey
            )
          );
        }

        const buyInstruction = await pumpProgram.methods
          .buy(buyParams.amount, buyParams.solAmount)
          .accounts({
            feeRecipient: global.feeRecipient,
            global: globalPDA,
            mint: mintKeyPair.publicKey,
            bondingCurve: bondingCurvePDA,
            associatedBondingCurve: associatedBondingCurveAccount,
            associatedUser,
            user: wallet.publicKey,
          })
          .instruction();

        instructions.push(buyInstruction);
      }

      const recentBlockhash = await connection
        .getLatestBlockhash("finalized")
        .then((v) => v.blockhash);

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash,
          instructions: [
            tipAccount
              ? SystemProgram.transfer({
                  fromPubkey: wallet.publicKey,
                  toPubkey: new PublicKey(tipAccount),
                  lamports: Math.max(
                    Math.floor((priorityFee * 300_000) / 1_000_000),
                    300000
                  ),
                })
              : null,
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: priorityFee,
            }),
            ...instructions,
          ].filter((v) => v !== null) as TransactionInstruction[],
        }).compileToV0Message()
      );

      tx.sign([mintKeyPair]);

      const signedTx = await signTransaction(tx);
      const signature = await sendTransaction(signedTx, connection);

      setName("");
      setTicker("");
      setDescription("");
      setWebsite("");
      setImage(undefined);
      setLoading(false);

      await toastTransaction({
        title: `create coin called ${name} [${ticker}]`,
        signature,
      });

      toast({
        title: "created new coin",
        description: "view it on the main page",
        action: (
          <Link href="/board">
            <button className="border border-white py-2 px-4 rounded-lg text-sm hover:bg-gray-900">
              View
            </button>
          </Link>
        ),
      });
    } catch (e) {
      console.error("could not create", e);

      await toastTransaction({
        title: "Could not create",
        description: (e as any)?.message,
        status: "error",
      });
    }
  };

  return (
    <div className="flex flex-col justify-center items-center mt-10">
      <Button
        variant="ghost"
        asChild
        className="text-2xl text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
      >
        <Link href="/board">[go back]</Link>
      </Button>

      <div className="rounded-lg p-6 max-w-[420px] text-white">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label
              className="mb-1 text-sm font-semibold text-blue-400"
              htmlFor="name"
            >
              name
            </label>
            <input
              className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2"
              id="name"
              placeholder=""
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label
              className="mb-1 text-sm font-semibold text-blue-400 "
              htmlFor="ticker"
            >
              ticker
            </label>

            <input
              className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2"
              id="ticker"
              placeholder=""
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label
              className="mb-1 text-sm font-semibold text-blue-400"
              htmlFor="text"
            >
              description
            </label>
            <textarea
              className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2 h-24"
              id="text"
              placeholder=""
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label
              className="mb-1 text-sm font-semibold text-blue-400"
              htmlFor="image"
            >
              image
            </label>

            <input
              className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2 w-full"
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
          </div>

          <div
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="cursor-pointer hover:underline text-blue-400 w-fit"
          >
            {showMoreOptions ? "Hide more options ↑" : "Show more options ↓"}
          </div>

          {showMoreOptions && (
            <>
              <div className="flex flex-col">
                <label
                  className="mb-1 text-sm font-semibold text-blue-400"
                  htmlFor="twitter"
                >
                  twitter link
                </label>
                <input
                  className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2"
                  id="twitter"
                  placeholder="(optional)"
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label
                  className="mb-1 text-sm font-semibold text-blue-400"
                  htmlFor="telegram"
                >
                  telegram link
                </label>
                <input
                  className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2"
                  id="telegram"
                  placeholder="(optional)"
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label
                  className="mb-1 text-sm font-semibold text-blue-400"
                  htmlFor="website"
                >
                  website
                </label>
                <input
                  className="bg-[#2a2a3b] border border-slate-200 rounded-md p-2"
                  id="website"
                  placeholder="(optional)"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {/* <div className="flex items-center gap-2 w-fit">
                Stay anon
                <Switch
                  checked={!showName}
                  onCheckedChange={(v) => setShowName(!v)}
                />
              </div> */}
            </>
          )}

          <CreateButton
            symbol={ticker}
            name={name}
            image={image as File}
            create={create}
            validate={validate}
          />

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <div>Cost to deploy: ~0.02 SOL</div>
        </div>
      </div>
    </div>
  );
}
