import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import pumpIdl from "../idl/pump.json";
import { PublicKey } from "@solana/web3.js";

export const usePumpProgram = () => {
  const [pumpProgram, setPumpProgram] = useState<Program<Idl>>();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  useEffect(() => {
    // construct anchor program interface
    const anchorProvider = new AnchorProvider(
      connection,
      wallet || (null as any),
      {}
    );

    const pumpProgram = new Program(
      pumpIdl as unknown as Idl,
      new PublicKey(process.env.NEXT_PUBLIC_PUMP_PROGRAM_ID as string),
      anchorProvider
    );

    setPumpProgram(pumpProgram);
  }, [connection, wallet]);

  return { pumpProgram };
};
