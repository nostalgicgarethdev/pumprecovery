import * as anchor from "@coral-xyz/anchor";
import { AutocratClient } from "@metadaoproject/futarchy-ts";
import {
  DEAN_DEVNET,
  DEVNET_DARK,
  DEVNET_DRIFT,
  DEVNET_MUSDC,
  DEVNET_ORE,
  FUTURE_DEVNET,
  META,
  USDC,
} from "./consts";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
let autocratClient: AutocratClient = AutocratClient.createClient({
  provider: new anchor.AnchorProvider(
    new Connection(
      "https://mainnet.helius-rpc.com/?api-key=1c2d68c2-7e5a-4109-a6d7-a201f44e1359"
    ),
    new anchor.Wallet(
      Keypair.fromSecretKey(
        new Uint8Array(
          JSON.parse(fs.readFileSync("/Users/staccoverflow/7i.json", "utf8"))
        )
      )
    ),
    {}
  ),
  autocratProgramId: new PublicKey(
    "metaRK9dUBnrAdZN6uUDKvxBVKW5pyCbPVmLtUZwtBp"
  ),
});
console.log(autocratClient);

async function main() {
  await autocratClient.initializeDao(DEVNET_DARK, 0.2, 10_000, 2_500, USDC);
}

main();
