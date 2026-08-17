import { AnchorProvider, BN, Idl, Program, utils } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import pumpIdl from "../idl/pump.json";

export interface Global {
  initialized: boolean;
  authority: PublicKey;
  feeRecipient: PublicKey;
  initialVirtualTokenReserves: BN;
  initialVirtualSolReserves: BN;
  initialRealTokenReserves: BN;
  tokenTotalSupply: BN;
  feeBasisPoints: BN;
}

export const useGlobal = () => {
  const [global, setGlobal] = useState<Global>();
  const [loading, setLoading] = useState(false);
  const [globalPDA, setGlobalPDA] = useState<PublicKey>();
  const { connection } = useConnection();

  const fetchGlobal = async () => {
    setLoading(true);

    // construct anchor program interface
    const anchorProvider = new AnchorProvider(connection, null as any, {});
    const pumpProgram = new Program(
      pumpIdl as unknown as Idl,
      new PublicKey(process.env.NEXT_PUBLIC_PUMP_PROGRAM_ID as string),
      anchorProvider
    );

    const [globalPDA] = PublicKey.findProgramAddressSync(
      [utils.bytes.utf8.encode("global")],
      pumpProgram.programId
    );

    // query the global
    const global = await pumpProgram.account.global.fetch(globalPDA);

    setGlobalPDA(globalPDA);
    setGlobal(global as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchGlobal();
  }, []);

  return { global, loading, fetchGlobal, globalPDA };
};
