import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const lamportsToSol = (lamports: BN) => {
  return lamports.toNumber() / LAMPORTS_PER_SOL;
};
