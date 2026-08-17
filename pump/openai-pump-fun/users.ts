import { Connection, PublicKey } from "@solana/web3.js";
import fs from "fs";
const connection = new Connection(
  "https://jarrett-solana-7ba9.mainnet.rpcpool.com/8d890735-edf2-4a75-af84-92f7c9e31718"
);
const signatures: number[] = [];
const users = JSON.parse(fs.readFileSync("users.json").toString());
async function main() {
  for (const user of users) {
    const sigs = await connection.getSignaturesForAddress(
      new PublicKey(user.user)
    );
    console.log(sigs.length);
    signatures.push(sigs.length);
    const totalUsers = signatures.length;
    const equalTo1000 = signatures.filter((sig) => sig === 1000).length;
    const lessThan1000 = signatures.filter((sig) => sig < 1000).length;
    const mean = signatures.reduce((acc, val) => acc + val, 0) / totalUsers;
    const sortedSignatures = [...signatures].sort((a, b) => a - b);
    const median =
      sortedSignatures.length % 2 === 0
        ? (sortedSignatures[sortedSignatures.length / 2 - 1] +
            sortedSignatures[sortedSignatures.length / 2]) /
          2
        : sortedSignatures[Math.floor(sortedSignatures.length / 2)];

    console.log(`Total Users: ${totalUsers}`);
    console.log(`Signatures equal to 1000: ${equalTo1000}`);
    console.log(`Signatures less than 1000: ${lessThan1000}`);
    console.log(`Mean of signatures: ${mean.toFixed(2)}`);
    console.log(`Median of signatures: ${median}`);
  }
}
main();
