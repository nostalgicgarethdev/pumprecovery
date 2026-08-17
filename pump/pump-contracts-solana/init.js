const anchor = require("@coral-xyz/anchor");
const { 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram 
} = require("@solana/web3.js");
const fs = require("fs");

function u64Le(bn) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(bn.toString()));
  return buf;
}

async function main() {
  const programId = new PublicKey("67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV");

  const secret = JSON.parse(fs.readFileSync("/Users/stacc/jjj.json", "utf8"));
  const keypair = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(secret));
  const walletPub = keypair.publicKey;

  console.log("Wallet (authority + feeRecipient):", walletPub.toBase58());
  console.log("Program ID:", programId.toBase58());
  console.log("RPC: Helius mainnet");

  const connection = new anchor.web3.Connection(
    "https://mainnet.helius-rpc.com/?api-key=dc8a996c-1c31-4960-b000-c4586d54f4bb",
    "confirmed"
  );

  const [globalPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    programId
  );
  console.log("Global PDA:", globalPDA.toBase58());

  // === initialize ===
  const initDisc = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  const initIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: globalPDA, isSigner: false, isWritable: true },
      { pubkey: walletPub, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initDisc,
  });

  try {
    console.log("Sending initialize...");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({
      feePayer: walletPub,
      blockhash,
      lastValidBlockHeight,
    }).add(initIx);
    tx.sign(keypair);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    console.log("initialize sig:", sig);
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    console.log("initialize confirmed");
  } catch (e) {
    const m = String(e);
    if (m.includes("AlreadyInitialized") || m.includes("already") || m.includes("0x64")) {
      console.log("Global already initialized — continuing.");
    } else {
      console.error("initialize error:", m);
    }
  }

  // === set_params ===
  const setDisc = Buffer.from([27, 234, 178, 52, 147, 2, 187, 141]);

  const feeRecipient = walletPub;

  const initialVirtualTokenReserves = new anchor.BN("1073000000000000");
  const initialVirtualSolReserves = new anchor.BN("30000000000");
  const initialRealTokenReserves = new anchor.BN("793100000000000");
  const tokenTotalSupply = new anchor.BN("1000000000000000");
  const feeBasisPoints = new anchor.BN("100");

  // event_cpi accounts
  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    programId
  );

  const data = Buffer.concat([
    setDisc,
    feeRecipient.toBuffer(),
    u64Le(initialVirtualTokenReserves),
    u64Le(initialVirtualSolReserves),
    u64Le(initialRealTokenReserves),
    u64Le(tokenTotalSupply),
    u64Le(feeBasisPoints),
  ]);

  const setIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: globalPDA, isSigner: false, isWritable: true },
      { pubkey: walletPub, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  try {
    console.log("Sending setParams (jjj as fee recipient)...");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({
      feePayer: walletPub,
      blockhash,
      lastValidBlockHeight,
    }).add(setIx);
    tx.sign(keypair);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    console.log("setParams sig:", sig);
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    console.log("setParams confirmed");
  } catch (e) {
    console.error("setParams error:", String(e));
    throw e;
  }

  // Verify existence
  const info = await connection.getAccountInfo(globalPDA);
  console.log("\nGlobal PDA on mainnet:", !!info);
  if (info) {
    console.log("  lamports:", info.lamports);
    console.log("  owner (program):", info.owner.toBase58());
  }

  console.log("\nInit flow complete on mainnet. jjj is authority + fee_recipient.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
