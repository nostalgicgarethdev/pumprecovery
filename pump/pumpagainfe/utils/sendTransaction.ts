import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import sleep from "sleep-promise";

const MAX_RETRIES = 5;
export const sendTransaction = async (
  tx: VersionedTransaction,
  connection: Connection
) => {
  const serializedTx = tx.serialize();
  const signature = await connection.sendRawTransaction(serializedTx, {
    skipPreflight: true,
  });

  // helius submission
  (async () => {
    for (let i = 0; i < MAX_RETRIES; i++) {
      await sleep(2_000);

      try {
        await connection.sendRawTransaction(serializedTx, {
          skipPreflight: true,
        });
      } catch (e) {
        console.warn(`Failed to resend transaction: ${e}`);
      }
    }
  })();

  // our server submission
  (async () => {
    await fetch(`${process.env.NEXT_PUBLIC_CLIENT_API_URL}/send-transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serializedTransaction: bs58.encode(serializedTx),
        retries: 5,
      }),
    });
  })();

  // jito submission
  (async () => {
    const res = await fetch(
      "https://mainnet.block-engine.jito.wtf:443/api/v1/transactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: [bs58.encode(serializedTx)],
        }),
      }
    ).then((r) => r.json());

    console.log("jito submission", res);
  })();

  // jito bundle submission
  (async () => {
    const res = await fetch(
      "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendBundle",
          params: [[bs58.encode(serializedTx)]],
        }),
      }
    ).then((r) => r.json());

    console.log("jito bundle submission", res);
  })();

  return signature;
};
