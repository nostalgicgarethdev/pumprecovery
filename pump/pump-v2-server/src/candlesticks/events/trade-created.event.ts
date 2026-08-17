import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export class TradeEvent {
  mint: PublicKey;
  solAmount: BN;
  tokenAmount: BN;
  isBuy: boolean;
  user: PublicKey;
  timestamp: BN;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
}
