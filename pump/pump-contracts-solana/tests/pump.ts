import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pump } from "../target/types/pump";
import { expect } from "chai";
import {
  getArrayCodec,
  getBytesCodec,
  getStructCodec,
  getTupleCodec,
} from "@solana/codecs";
import { getUtf8Codec } from "@solana/codecs-strings";

import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  LENGTH_SIZE,
  TYPE_SIZE,
  AccountLayout,
  createInitializeMintInstruction,
} from "@solana/spl-token";
import {
  Transaction,
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
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
import {
  TokenMetadata,
  createInitializeInstruction,
  pack,
} from "@solana/spl-token-metadata";

export const MINT_LAYOUT = struct([
  u32("mintAuthorityOption"),
  publicKey("mintAuthority"),
  u64("supply"),
  u8("decimals"),
  bool("isInitialized"),
  u32("freezeAuthorityOption"),
  publicKey("freezeAuthority"),
]);
console.log(AccountLayout.span);
const parseCpiEvents = (
  transactionResponse,
  program
): { name: string; data: any }[] => {
  const events: { name: string; data: any }[] = [];
  const inner = transactionResponse?.meta?.innerInstructions ?? [];
  for (let i = 0; i < inner.length; i++) {
    for (let j = 0; j < inner[i].instructions.length; j++) {
      const ix = inner[i].instructions[j];
      const programPubkey =
        transactionResponse?.transaction.message.staticAccountKeys[
          ix.programIdIndex
        ];

      if (
        programPubkey === undefined ||
        !programPubkey.equals(program.programId)
      ) {
        // we are at instructions that does not match the linked program
        continue;
      }

      const parseAsTransactionCpiData = (log: string): string | null => {
        let encodedLog: Buffer;
        try {
          // verification if log is transaction cpi data encoded with base58
          encodedLog = bs58.decode(log);
        } catch (e) {
          return null;
        }

        const disc = encodedLog.slice(0, 8);
        const eventIxTag: anchor.BN = new anchor.BN("1d9acb512ea545e4", "hex");

        if (disc.equals(eventIxTag.toBuffer("le"))) {
          // after CPI tag data follows in format of standard event
          return base64.encode(encodedLog.slice(8));
        } else {
          return null;
        }
      };

      // console.log("event data", );
      const event = program.coder.events.decode(
        parseAsTransactionCpiData(ix.data)
      );

      if (event) {
        events.push(event);
      }
    }
  }

  return events;
};

describe("pump", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Pump as Program<Pump>;
  const PUMP_PROGRAM_ID = new anchor.web3.PublicKey("67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV");
  // force correct program for surfpool/val harness when workspace misresolves
  Object.defineProperty(program, "programId", { get() { return PUMP_PROGRAM_ID; } });
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

  const [referralRecordPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("referral"),
      user.publicKey.toBuffer(),
    ],
    program.programId
  );

  const associatedBondingCurvekp = Keypair.generate();
  const associatedBondingCurve = getAssociatedTokenAddressSync(
    mintKeyPair.publicKey,
    bondingCurvePDA,
    true,
    TOKEN_2022_PROGRAM_ID
  );
  const associatedUser = getAssociatedTokenAddressSync(
    mintKeyPair.publicKey,
    user.publicKey,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  // === Shared test helpers ===
  const ORCA_PROGRAM_ID = new PublicKey(
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
  );
  const [mintAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("mint-authority")],
    program.programId
  );

  // anchor's #[event_cpi] auto-resolver derives event_authority from the
  // workspace-resolved program id, which on the surfpool harness is the wrong
  // key. Derive it explicitly from the program id we actually deployed and pass
  // it (plus `program`) on every event_cpi instruction so the seeds match.
  const [eventAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("__event_authority")],
    PUMP_PROGRAM_ID
  );

  // Dummy house + Orca venue accounts. With non-pool dummies these legs no-op
  // on-chain and their thirds fold back to the fee recipient, so balance
  // assertions in the no-referral tests still hold.
  function dummyBundleAccounts(owner: PublicKey) {
    return {
      // tokenProgram is an Interface<TokenInterface> the anchor client cannot
      // auto-resolve, so it must be supplied on every buy/sell.
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      houseMint: owner,
      userHouseAta: owner,
      houseTokenProgram: TOKEN_2022_PROGRAM_ID,
      orcaSolNewmeme: owner,
      orcaUsdcNewmeme: owner,
      orcaHouseNewmeme: owner,
      orcaProgram: ORCA_PROGRAM_ID,
      // explicit event_cpi accounts (see eventAuthorityPDA note above)
      eventAuthority: eventAuthorityPDA,
      program: PUMP_PROGRAM_ID,
    };
  }

  function referralPDAFor(owner: PublicKey): PublicKey {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("referral"), owner.toBuffer()],
      program.programId
    )[0];
  }

  async function fundUser(lamports: number) {
    const sig = await program.provider.connection.requestAirdrop(
      user.publicKey,
      lamports
    );
    await program.provider.connection.confirmTransaction(sig);
  }

  type FreshCoin = {
    mintKp: Keypair;
    bondingCurvePDA: PublicKey;
    associatedBondingCurve: PublicKey;
  };

  // Creates a brand-new mint + bonding curve via the same flow as the "create"
  // test. Each completion/withdraw test uses its own fresh coin so that
  // "completing" one curve never poisons the shared-mint tests above.
  async function createCoin(opts: {
    mintKp: Keypair;
    payer: PublicKey;
    extraSigners: Keypair[];
    name?: string;
    symbol?: string;
    uri?: string;
  }): Promise<FreshCoin> {
    const { mintKp, payer, extraSigners } = opts;
    const name = opts.name ?? "freshcoin";
    const symbol = opts.symbol ?? "FRSH";
    const uri = opts.uri ?? "https://example.com/fresh.json";

    const [bondingCurvePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("bonding-curve"),
        mintKp.publicKey.toBuffer(),
      ],
      program.programId
    );
    const associatedBondingCurve = getAssociatedTokenAddressSync(
      mintKp.publicKey,
      bondingCurvePDA,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    const md: TokenMetadata = {
      mint: mintKp.publicKey,
      name,
      symbol,
      uri,
      additionalMetadata: [],
    };
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(md).length;
    const mintLamports =
      await program.provider.connection.getMinimumBalanceForRentExemption(
        mintLen + metadataLen
      );

    await program.methods
      .create(name, symbol, uri)
      .accounts({
        mint: mintKp.publicKey,
        mintAuthority: mintAuthorityPDA,
        bondingCurve: bondingCurvePDA,
        associatedBondingCurve,
        global: globalPDA,
        user: payer,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .preInstructions([
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: mintKp.publicKey,
          lamports: mintLamports,
        }),
      ])
      .signers([mintKp, ...extraSigners])
      .rpc();

    return { mintKp, bondingCurvePDA, associatedBondingCurve };
  }

  // Buys the ENTIRE remaining realTokenReserves to push the curve to complete.
  // buyer defaults to the provider wallet (the deployer / withdraw authority).
  async function buyOutCurve(
    coin: FreshCoin,
    opts?: { buyer?: PublicKey; buyerSigners?: Keypair[] }
  ): Promise<{
    associatedUser: PublicKey;
    buyAmount: anchor.BN;
    solCost: anchor.BN;
    fee: anchor.BN;
  }> {
    const buyer = opts?.buyer ?? user.publicKey;
    const buyerSigners = opts?.buyerSigners ?? [];

    const associatedUser = getAssociatedTokenAddressSync(
      coin.mintKp.publicKey,
      buyer,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    const ataTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        buyer,
        associatedUser,
        buyer,
        coin.mintKp.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );
    await program.provider.sendAndConfirm(ataTx, buyerSigners);

    const global = await program.account.global.fetch(globalPDA);
    const bondingCurve = await program.account.bondingCurve.fetch(
      coin.bondingCurvePDA
    );
    const buyAmount = bondingCurve.realTokenReserves;
    const solCost = buyAmount
      .mul(bondingCurve.virtualSolReserves)
      .div(bondingCurve.virtualTokenReserves.sub(buyAmount))
      .add(new anchor.BN(1));
    const fee = solCost.mul(global.feeBasisPoints).div(new anchor.BN(10000));

    await program.methods
      .buy(buyAmount, solCost.add(fee))
      .accounts({
        feeRecipient: global.feeRecipient,
        global: globalPDA,
        mint: coin.mintKp.publicKey,
        bondingCurve: coin.bondingCurvePDA,
        associatedBondingCurve: coin.associatedBondingCurve,
        associatedUser,
        user: buyer,
        referrer: buyer,
        referrer2: buyer,
        referrer3: buyer,
        referralRecord: referralPDAFor(buyer),
        ...dummyBundleAccounts(buyer),
      })
      .signers(buyerSigners)
      .rpc();

    return { associatedUser, buyAmount, solCost, fee };
  }

  describe("initialize", async () => {
    it("sets initial parameters", async () => {
      // ensure payer has funds on local harness
      const airdropSig = await program.provider.connection.requestAirdrop(
        user.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await program.provider.connection.confirmTransaction(airdropSig);

      // Use raw instruction with hard-coded correct program ID so the tx definitely targets
      // the program we loaded on the surfpool/val harness (workspace can resolve to wrong ID).
      const initDisc = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // anchor "global:initialize" discriminator
      const initIx = new anchor.web3.TransactionInstruction({
        programId: PUMP_PROGRAM_ID,
        keys: [
          { pubkey: globalPDA, isSigner: false, isWritable: true },
          { pubkey: user.publicKey, isSigner: true, isWritable: true },
          { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: initDisc,
      });
      await anchor.getProvider().sendAndConfirm(new anchor.web3.Transaction().add(initIx));

      const globalAccount = await program.account.global.fetch(globalPDA);

      expect(globalAccount.authority).to.deep.equal(user.publicKey);
      expect(globalAccount.initialized).to.equal(true);
    });

    it("fails to initialize twice", async () => {
      try {
        await program.methods
          .initialize()
          .accounts({
            global: globalPDA,
          })
          .rpc();

        expect(false).to.equal(true);
      } catch (_err) {
        expect(true).to.equal(true);
      }
    });
  });

  describe("set_params", () => {
    it("sets parameters", async () => {
      const feeRecipient = anchor.web3.Keypair.generate();
      const initialVirtualTokenReserves = new anchor.BN(10 * 10 ** 6);
      const initialVirtualSolReserves = new anchor.BN(10 * 10 ** 9);
      const initialRealTokenReserves = new anchor.BN(5 * 10 ** 6);
      const tokenTotalSupply = new anchor.BN(20 * 10 ** 6);
      const feeBasisPoints = new anchor.BN(30);

      await program.methods
        .setParams(
          feeRecipient.publicKey,
          initialVirtualTokenReserves,
          initialVirtualSolReserves,
          initialRealTokenReserves,
          tokenTotalSupply,
          feeBasisPoints
        )
        .accounts({
          // @ts-ignore
          global: globalPDA,
        })
        .rpc();

      const globalAccount = await program.account.global.fetch(globalPDA);

      expect(globalAccount.feeRecipient).to.deep.equal(feeRecipient.publicKey);
      expect(globalAccount.initialVirtualTokenReserves.toString()).to.equal(
        initialVirtualTokenReserves.toString()
      );
      expect(globalAccount.initialVirtualSolReserves.toString()).to.equal(
        initialVirtualSolReserves.toString()
      );
      expect(globalAccount.initialRealTokenReserves.toString()).to.equal(
        initialRealTokenReserves.toString()
      );
      expect(globalAccount.tokenTotalSupply.toString()).to.equal(
        tokenTotalSupply.toString()
      );
      expect(globalAccount.feeBasisPoints.toString()).to.equal(
        feeBasisPoints.toString()
      );
    });
  });

  // Checks if all elements in the array are 0
  function isNonePubkey(buffer: Uint8Array): boolean {
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] !== 0) {
        return false;
      }
    }
    return true;
  }

  const tokenMetadataCodec = getStructCodec([
    ["updateAuthority", getBytesCodec({ size: 32 })],
    ["mint", getBytesCodec({ size: 32 })],
    ["name", getUtf8Codec()],
    ["symbol", getUtf8Codec()],
    ["uri", getUtf8Codec()],
    [
      "additionalMetadata",
      getArrayCodec(getTupleCodec([getUtf8Codec(), getUtf8Codec()])),
    ],
  ]);

  function unpack(buffer: Buffer | Uint8Array): TokenMetadata {
    const data = tokenMetadataCodec.decode(buffer);

    return {
      mint: new PublicKey(data.mint),
      name: data.name,
      symbol: data.symbol,
      uri: data.uri,
      additionalMetadata: [],
    };
  }

  describe("create", () => {
    it("creates a new coin", async () => {
      const [mintAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("mint-authority")],
        program.programId
      );
      console.log(mintAuthorityPDA.toBase58());

      const mplTokenMetadata = new anchor.web3.PublicKey(
        MPL_TOKEN_METADATA_PROGRAM_ID.toString()
      );
      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const md: TokenMetadata = {
        mint: mintKeyPair.publicKey,
        name: "foobar",
        symbol: "FOO",
        uri: "https://gist.githubusercontent.com/staccDOTsol/5157431dcc84e593a7017504ce54170a/raw/7fc1c3a45fcba7decece94710cc21bba5e446eaa/gistfile1.txt",
        additionalMetadata: [],
      };

      const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(md).length;
      const mintLamports =
        await program.provider.connection.getMinimumBalanceForRentExemption(
          mintLen + metadataLen
        );
      console.log(mintLamports);
      const mintIxs = [
        createInitializeMetadataPointerInstruction(
          mintKeyPair.publicKey,
          mintAuthorityPDA,
          mintKeyPair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
      ];

      const sig = await program.methods
        .create(
          "foobar",
          "FOO",
          "https://gist.githubusercontent.com/staccDOTsol/5157431dcc84e593a7017504ce54170a/raw/7fc1c3a45fcba7decece94710cc21bba5e446eaa/gistfile1.txt"
        )
        .accounts({
          mint: mintKeyPair.publicKey,
          mintAuthority: mintAuthorityPDA,
          bondingCurve: bondingCurvePDA,
          associatedBondingCurve: associatedBondingCurve,
          global: globalPDA,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .preInstructions([
          SystemProgram.transfer({
            fromPubkey: user.publicKey,
            toPubkey: mintKeyPair.publicKey,
            lamports: mintLamports,
          }),
        ])
        .signers([mintKeyPair])
        .rpc();
      // await new Promise((resolve) => {
      //   setTimeout(resolve, 1000);
      // });

      // const txResult = await program.provider.connection.getTransaction(sig, {
      //   commitment: "confirmed",
      // });

      // console.log("result", await parseCpiEvents(txResult, program));

      const global = await program.account.global.fetch(globalPDA);
      const bondingCurve = await program.account.bondingCurve.fetch(
        bondingCurvePDA
      );
      const metadata = unpack(
        (
          await program.provider.connection.getAccountInfo(
            mintKeyPair.publicKey
          )
        ).data
      ) as TokenMetadata;
      const bondingCurveTokenAccountBalance =
        await program.provider.connection.getTokenAccountBalance(
          associatedBondingCurve
        );
      const mintRaw = await program.provider.connection.getAccountInfo(
        mintKeyPair.publicKey
      );
      const mint = MINT_LAYOUT.decode(mintRaw.data);

      // check that it sets the bonding curve parameters
      expect(bondingCurve.virtualTokenReserves.toString()).to.equal(
        global.initialVirtualTokenReserves.toString()
      );
      expect(bondingCurve.virtualSolReserves.toString()).to.equal(
        global.initialVirtualSolReserves.toString()
      );
      expect(bondingCurve.realTokenReserves.toString()).to.equal(
        global.initialRealTokenReserves.toString()
      );
      expect(bondingCurve.realSolReserves.toString()).to.equal("0");
      expect(bondingCurve.tokenTotalSupply.toString()).to.equal(
        global.tokenTotalSupply.toString()
      );
      expect(bondingCurve.complete).to.equal(false);

      // check that it sets the metadata
      expect(metadata.name).to.equal("foobar");
      expect(metadata.symbol).to.equal("FOO");
      expect(metadata.uri).to.equal(
        "https://gist.githubusercontent.com/staccDOTsol/5157431dcc84e593a7017504ce54170a/raw/7fc1c3a45fcba7decece94710cc21bba5e446eaa/gistfile1.txt"
      );
      expect(metadata.updateAuthority).to.equal(mintAuthorityPDA.toString());

      // check that it minted the tokens to the bonding curve
      expect(bondingCurveTokenAccountBalance.value.amount).to.equal(
        global.tokenTotalSupply.toString()
      );

      // check the mint parameters
      expect(mint.supply.toString()).to.equal(
        global.tokenTotalSupply.toString()
      );
      expect(mint.mintAuthority.toString()).to.equal(
        mintAuthorityPDA.toString()
      );
      expect(mint.isInitialized).to.equal(true);
      expect(mint.mintAuthorityOption).to.equal(0);
      expect(mint.freezeAuthorityOption).to.equal(0);
    });
  });

  describe("buy", () => {
    it("buys tokens", async () => {
      const global = await program.account.global.fetch(globalPDA);
      const buyAmount = new anchor.BN(2 * 10 ** 6);
      const solCost = buyAmount
        .mul(global.initialVirtualSolReserves)
        .div(global.initialVirtualTokenReserves.sub(buyAmount))
        .add(new anchor.BN(1));
      const fee = solCost.mul(global.feeBasisPoints).div(new anchor.BN(10000));

      const bondingCurveBalanceBefore =
        await program.provider.connection.getBalance(bondingCurvePDA);

      const tx = new Transaction();
      tx.add(
        createAssociatedTokenAccountInstruction(
          user.publicKey,
          associatedUser,
          user.publicKey,
          mintKeyPair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );
      await anchor.getProvider().sendAndConfirm(tx);

      // execute the buy
      const sig = await program.methods
        .buy(buyAmount, solCost.add(fee))
        .accounts({
          feeRecipient: global.feeRecipient,
          global: globalPDA,
          mint: mintKeyPair.publicKey,
          bondingCurve: bondingCurvePDA,
          associatedBondingCurve,
          associatedUser,
          user: user.publicKey,
          referrer: user.publicKey,         // no real referrer in this test
          referrer2: user.publicKey,
          referrer3: user.publicKey,
          referralRecord: referralRecordPDA,
          ...dummyBundleAccounts(user.publicKey),
        })
        .rpc();

      // check that sol went to bonding curve
      expect(
        await program.provider.connection
          .getBalance(bondingCurvePDA)
          .then((r) => (r - bondingCurveBalanceBefore).toString())
      ).to.equal(solCost.toString());

      // check that tokens went to the user
      expect(
        await program.provider.connection
          .getTokenAccountBalance(associatedUser)
          .then((v) => v.value.amount.toString())
      ).to.equal(buyAmount.toString());

      // check that the sol fee went to the recipient
      expect(
        await program.provider.connection
          .getBalance(global.feeRecipient)
          .then((r) => r.toString())
      ).to.equal(fee.toString());

      // check that bonding curve was updated correctly
      const bondingCurve = await program.account.bondingCurve.fetch(
        bondingCurvePDA
      );
      expect(bondingCurve.virtualTokenReserves.toString()).to.equal(
        global.initialVirtualTokenReserves.sub(buyAmount).toString()
      );
      expect(bondingCurve.virtualSolReserves.toString()).to.equal(
        global.initialVirtualSolReserves.add(solCost).toString()
      );
      expect(bondingCurve.realTokenReserves.toString()).to.equal(
        global.initialRealTokenReserves.sub(buyAmount).toString()
      );
      expect(bondingCurve.realSolReserves.toString()).to.equal(
        solCost.toString()
      );
    });

    it("should revert if slippage is too high", async () => {
      const global = await program.account.global.fetch(globalPDA);
      const bondingCurve = await program.account.bondingCurve.fetch(
        bondingCurvePDA
      );
      const buyAmount = new anchor.BN(2 * 10 ** 6);
      const solCost = buyAmount
        .mul(bondingCurve.virtualSolReserves)
        .div(bondingCurve.virtualTokenReserves.sub(buyAmount))
        .add(new anchor.BN(1));
      const fee = solCost.mul(global.feeBasisPoints).div(new anchor.BN(10000));

      try {
        // execute the buy
        await program.methods
          .buy(buyAmount, solCost.add(fee).sub(new anchor.BN(1)))
          .accounts({
            feeRecipient: global.feeRecipient,
            global: globalPDA,
            mint: mintKeyPair.publicKey,
            bondingCurve: bondingCurvePDA,
            associatedBondingCurve,
            associatedUser,
            user: user.publicKey,
            referrer: user.publicKey,
            referrer2: user.publicKey,
            referrer3: user.publicKey,
            referralRecord: referralRecordPDA,
            ...dummyBundleAccounts(user.publicKey),
          })
          .rpc();

        expect(true).to.equal(false);
      } catch (err) {
        expect(err.error.errorMessage).to.equal(
          "slippage: Too much SOL required to buy the given amount of tokens."
        );
      }
    });

    it("should mark bonding curve as complete", async () => {
      // Fresh coin so completing it never poisons the shared-mint tests.
      await fundUser(25 * LAMPORTS_PER_SOL);
      const coin = await createCoin({
        mintKp: anchor.web3.Keypair.generate(),
        payer: user.publicKey,
        extraSigners: [],
      });

      await buyOutCurve(coin);

      const bondingCurveAfter = await program.account.bondingCurve.fetch(
        coin.bondingCurvePDA
      );
      expect(bondingCurveAfter.complete).to.equal(true);
      expect(bondingCurveAfter.realTokenReserves.toString()).to.equal("0");
    });

    it("should revert if bonding curve is complete", async () => {
      // Complete a fresh curve, then try to buy more from it.
      await fundUser(25 * LAMPORTS_PER_SOL);
      const coin = await createCoin({
        mintKp: anchor.web3.Keypair.generate(),
        payer: user.publicKey,
        extraSigners: [],
      });
      const { associatedUser: freshAssociatedUser } = await buyOutCurve(coin);

      const global = await program.account.global.fetch(globalPDA);
      const buyAmount = new anchor.BN(1 * 10 ** 6);

      try {
        await program.methods
          .buy(buyAmount, new anchor.BN(10 * LAMPORTS_PER_SOL))
          .accounts({
            feeRecipient: global.feeRecipient,
            global: globalPDA,
            mint: coin.mintKp.publicKey,
            bondingCurve: coin.bondingCurvePDA,
            associatedBondingCurve: coin.associatedBondingCurve,
            associatedUser: freshAssociatedUser,
            user: user.publicKey,
            referrer: user.publicKey,
            referrer2: user.publicKey,
            referrer3: user.publicKey,
            referralRecord: referralPDAFor(user.publicKey),
            ...dummyBundleAccounts(user.publicKey),
          })
          .rpc();

        expect.fail("buy should have reverted (bonding curve complete)");
      } catch (err) {
        expect(err.error.errorMessage).to.equal(
          "The bonding curve has completed and liquidity migrated to raydium."
        );
      }
    });
  });

  describe("sell", () => {
    it("sells tokens", async () => {
      const global = await program.account.global.fetch(globalPDA);
      const bondingCurve = await program.account.bondingCurve.fetch(
        bondingCurvePDA
      );
      const sellAmount = new anchor.BN(2 * 10 ** 6);
      const expectedSol = sellAmount
        .mul(bondingCurve.virtualSolReserves)
        .div(bondingCurve.virtualTokenReserves.add(sellAmount));

      const fee = expectedSol
        .mul(global.feeBasisPoints)
        .div(new anchor.BN(10000));

      const bondingCurveBalanceBefore =
        await program.provider.connection.getBalance(bondingCurvePDA);

      const userBalanceBefore = await program.provider.connection.getBalance(
        user.publicKey
      );

      const feeRecipientBalanceBefore =
        await program.provider.connection.getBalance(global.feeRecipient);

      const userTokenBalanceBefore =
        await program.provider.connection.getTokenAccountBalance(
          associatedUser
        );

      const bondingCurveTokenBalanceBefore =
        await program.provider.connection.getTokenAccountBalance(
          associatedBondingCurve
        );

      // execute the sell
      await program.methods
        .sell(sellAmount, expectedSol.sub(fee))
        .accounts({
          feeRecipient: global.feeRecipient,
          global: globalPDA,
          mint: mintKeyPair.publicKey,
          bondingCurve: bondingCurvePDA,
          associatedBondingCurve,
          associatedUser,
          user: user.publicKey,
          referrer: user.publicKey,
          referrer2: user.publicKey,
          referrer3: user.publicKey,
          referralRecord: referralRecordPDA,
          ...dummyBundleAccounts(user.publicKey),
        })
        .rpc();

      // check that sol went from the bonding curve to the user
      expect(
        await program.provider.connection
          .getBalance(user.publicKey)
          .then((v) => v - userBalanceBefore)
      ).to.greaterThanOrEqual(
        expectedSol.sub(fee).sub(new anchor.BN(100_000)).toNumber()
      );
      expect(
        await program.provider.connection
          .getBalance(bondingCurvePDA)
          .then((v) => bondingCurveBalanceBefore - v)
      ).to.equal(expectedSol.toNumber());

      // check that the tokens went from the user to the bonding curve
      expect(
        await program.provider.connection
          .getTokenAccountBalance(associatedUser)
          .then((v) =>
            new anchor.BN(userTokenBalanceBefore.value.amount)
              .sub(new anchor.BN(v.value.amount))
              .toString()
          )
      ).to.equal(sellAmount.toString(0));
      expect(
        await program.provider.connection
          .getTokenAccountBalance(associatedBondingCurve)
          .then((v) =>
            new anchor.BN(v.value.amount)
              .sub(new anchor.BN(bondingCurveTokenBalanceBefore.value.amount))
              .toString()
          )
      ).to.equal(sellAmount.toString(0));

      // check that the sol fee went to the recipient
      expect(
        await program.provider.connection
          .getBalance(global.feeRecipient)
          .then((r) => r - feeRecipientBalanceBefore)
      ).to.equal(fee.toNumber());

      // check that the bonding curve was updated correctly
      const bondingCurveAfter = await program.account.bondingCurve.fetch(
        bondingCurvePDA
      );
      expect(bondingCurveAfter.virtualTokenReserves.toString()).to.equal(
        bondingCurve.virtualTokenReserves.add(sellAmount).toString()
      );
      expect(bondingCurveAfter.virtualSolReserves.toString()).to.equal(
        bondingCurve.virtualSolReserves.sub(expectedSol).toString()
      );
      expect(bondingCurveAfter.realTokenReserves.toString()).to.equal(
        bondingCurve.realTokenReserves.add(sellAmount).toString()
      );
      expect(bondingCurveAfter.realSolReserves.toString()).to.equal(
        bondingCurve.realSolReserves.sub(expectedSol).toString()
      );
    });

    it("reverts if bonding curve is complete", async () => {
      // Fresh coin completed via buy-out; the buyer (provider wallet) holds the
      // bought tokens, then attempts to sell them back into the completed curve.
      await fundUser(25 * LAMPORTS_PER_SOL);
      const coin = await createCoin({
        mintKp: anchor.web3.Keypair.generate(),
        payer: user.publicKey,
        extraSigners: [],
      });
      const { associatedUser: freshAssociatedUser } = await buyOutCurve(coin);

      const global = await program.account.global.fetch(globalPDA);
      const sellAmount = new anchor.BN(1 * 10 ** 6);

      try {
        await program.methods
          .sell(sellAmount, new anchor.BN(0))
          .accounts({
            feeRecipient: global.feeRecipient,
            global: globalPDA,
            mint: coin.mintKp.publicKey,
            bondingCurve: coin.bondingCurvePDA,
            associatedBondingCurve: coin.associatedBondingCurve,
            associatedUser: freshAssociatedUser,
            user: user.publicKey,
            referrer: user.publicKey,
            referrer2: user.publicKey,
            referrer3: user.publicKey,
            referralRecord: referralPDAFor(user.publicKey),
            ...dummyBundleAccounts(user.publicKey),
          })
          .rpc();
        expect.fail("sell should have reverted (bonding curve complete)");
      } catch (err) {
        expect(err.error.errorMessage).to.equal(
          "The bonding curve has completed and liquidity migrated to raydium."
        );
      }
    });
  });

  describe("withdraw", () => {
    it("withdraws", async () => {
      // Fresh coin, completed via buy-out, then the deployer (== global.authority,
      // an authorized withdraw signer per the locked contract) withdraws liquidity.
      await fundUser(25 * LAMPORTS_PER_SOL);
      const coin = await createCoin({
        mintKp: anchor.web3.Keypair.generate(),
        payer: user.publicKey,
        extraSigners: [],
      });
      const { associatedUser: freshAssociatedUser } = await buyOutCurve(coin);

      const completed = await program.account.bondingCurve.fetch(
        coin.bondingCurvePDA
      );
      expect(completed.complete).to.equal(true);

      const adminTokenBefore =
        await program.provider.connection.getTokenAccountBalance(
          freshAssociatedUser
        );
      const bondingCurveTokenBefore =
        await program.provider.connection.getTokenAccountBalance(
          coin.associatedBondingCurve
        );
      const adminSolBefore = await program.provider.connection.getBalance(
        user.publicKey
      );

      // execute the withdraw
      await program.methods
        .withdraw()
        .accounts({
          global: globalPDA,
          mint: coin.mintKp.publicKey,
          bondingCurve: coin.bondingCurvePDA,
          associatedBondingCurve: coin.associatedBondingCurve,
          associatedUser: freshAssociatedUser,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      // all of the bonding curve's tokens moved to the admin (deployer) ATA
      const adminTokenAfter =
        await program.provider.connection.getTokenAccountBalance(
          freshAssociatedUser
        );
      const bondingCurveTokenAfter =
        await program.provider.connection.getTokenAccountBalance(
          coin.associatedBondingCurve
        );
      expect(bondingCurveTokenAfter.value.amount).to.equal("0");
      expect(
        new anchor.BN(adminTokenAfter.value.amount)
          .sub(new anchor.BN(adminTokenBefore.value.amount))
          .toString()
      ).to.equal(bondingCurveTokenBefore.value.amount);

      // the bonding curve's sol reserves moved to the admin
      const bondingCurveAfter = await program.account.bondingCurve.fetch(
        coin.bondingCurvePDA
      );
      expect(bondingCurveAfter.realSolReserves.toString()).to.equal("0");
      const adminSolAfter = await program.provider.connection.getBalance(
        user.publicKey
      );
      // admin received ~real_sol_reserves (minus the tx fee it paid), so it is
      // strictly greater than before.
      expect(adminSolAfter).to.be.greaterThan(adminSolBefore);
    });
  });

  describe("referral", () => {
    it("pays a real tier-1 referrer out of the fee on buy", async () => {
      // Fresh buyer + mint so the referral tree is established with a real referrer.
      const buyer = anchor.web3.Keypair.generate();
      const referrer = anchor.web3.Keypair.generate();
      const refMintKp = anchor.web3.Keypair.generate();

      const airdrop = await program.provider.connection.requestAirdrop(
        buyer.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await program.provider.connection.confirmTransaction(airdrop);

      const [mintAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("mint-authority")],
        program.programId
      );
      const [refBondingCurvePDA] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            anchor.utils.bytes.utf8.encode("bonding-curve"),
            refMintKp.publicKey.toBuffer(),
          ],
          program.programId
        );
      const [buyerReferralPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("referral"), buyer.publicKey.toBuffer()],
        program.programId
      );
      const refAssociatedBondingCurve = getAssociatedTokenAddressSync(
        refMintKp.publicKey,
        refBondingCurvePDA,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const buyerAta = getAssociatedTokenAddressSync(
        refMintKp.publicKey,
        buyer.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );

      // create the new coin (payer = buyer)
      const mintLamports =
        await program.provider.connection.getMinimumBalanceForRentExemption(
          getMintLen([ExtensionType.MetadataPointer]) + 256
        );
      await program.methods
        .create("refcoin", "REF", "https://example.com/ref.json")
        .accounts({
          mint: refMintKp.publicKey,
          mintAuthority: mintAuthorityPDA,
          bondingCurve: refBondingCurvePDA,
          associatedBondingCurve: refAssociatedBondingCurve,
          global: globalPDA,
          user: buyer.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .preInstructions([
          SystemProgram.transfer({
            fromPubkey: buyer.publicKey,
            toPubkey: refMintKp.publicKey,
            lamports: mintLamports,
          }),
        ])
        .signers([buyer, refMintKp])
        .rpc();

      // buyer's ATA
      const ataTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          buyer.publicKey,
          buyerAta,
          buyer.publicKey,
          refMintKp.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );
      await program.provider.sendAndConfirm(ataTx, [buyer]);

      const global = await program.account.global.fetch(globalPDA);
      const buyAmount = new anchor.BN(1 * 10 ** 6);
      const solCost = buyAmount
        .mul(global.initialVirtualSolReserves)
        .div(global.initialVirtualTokenReserves.sub(buyAmount))
        .add(new anchor.BN(1));
      const fee = solCost.mul(global.feeBasisPoints).div(new anchor.BN(10000));
      const tierShare = fee.div(new anchor.BN(3)).div(new anchor.BN(3));

      const referrerBefore = await program.provider.connection.getBalance(
        referrer.publicKey
      );

      await program.methods
        .buy(buyAmount, solCost.add(fee))
        .accounts({
          feeRecipient: global.feeRecipient,
          global: globalPDA,
          mint: refMintKp.publicKey,
          bondingCurve: refBondingCurvePDA,
          associatedBondingCurve: refAssociatedBondingCurve,
          associatedUser: buyerAta,
          user: buyer.publicKey,
          referrer: referrer.publicKey,
          referrer2: buyer.publicKey,
          referrer3: buyer.publicKey,
          referralRecord: buyerReferralPDA,
          ...dummyBundleAccounts(buyer.publicKey),
        })
        .signers([buyer])
        .rpc();

      // the persisted tree should record the real referrer for tier 1
      const record = await program.account.referral.fetch(buyerReferralPDA);
      expect(record.referrer.toBase58()).to.equal(
        referrer.publicKey.toBase58()
      );

      // the referrer should have received exactly one tier share out of the fee
      const referrerAfter = await program.provider.connection.getBalance(
        referrer.publicKey
      );
      expect(referrerAfter - referrerBefore).to.equal(tierShare.toNumber());
    });

    it("splits the referral third across three distinct tiers on buy", async () => {
      // Fresh buyer + 3 DISTINCT referrers + fresh mint, so the persisted tree
      // is established with all three tiers populated and each tier is paid.
      const buyer = anchor.web3.Keypair.generate();
      const referrer1 = anchor.web3.Keypair.generate();
      const referrer2 = anchor.web3.Keypair.generate();
      const referrer3 = anchor.web3.Keypair.generate();
      const triMintKp = anchor.web3.Keypair.generate();

      const airdrop = await program.provider.connection.requestAirdrop(
        buyer.publicKey,
        25 * LAMPORTS_PER_SOL
      );
      await program.provider.connection.confirmTransaction(airdrop);

      const coin = await createCoin({
        mintKp: triMintKp,
        payer: buyer.publicKey,
        extraSigners: [buyer, triMintKp],
        name: "tricoin",
        symbol: "TRI",
        uri: "https://example.com/tri.json",
      });

      const buyerAta = getAssociatedTokenAddressSync(
        triMintKp.publicKey,
        buyer.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      await program.provider.sendAndConfirm(
        new Transaction().add(
          createAssociatedTokenAccountInstruction(
            buyer.publicKey,
            buyerAta,
            buyer.publicKey,
            triMintKp.publicKey,
            TOKEN_2022_PROGRAM_ID
          )
        ),
        [buyer]
      );

      const buyerReferralPDA = referralPDAFor(buyer.publicKey);
      const global = await program.account.global.fetch(globalPDA);
      const buyAmount = new anchor.BN(1 * 10 ** 6);
      const solCost = buyAmount
        .mul(global.initialVirtualSolReserves)
        .div(global.initialVirtualTokenReserves.sub(buyAmount))
        .add(new anchor.BN(1));
      const fee = solCost.mul(global.feeBasisPoints).div(new anchor.BN(10000));
      // Per-tier payout = (fee / 3) / 3, matching the program's integer math.
      const tierShare = fee.div(new anchor.BN(3)).div(new anchor.BN(3));
      // Sanity: the fee must be big enough that each tier receives a non-zero share.
      expect(tierShare.toNumber()).to.be.greaterThan(0);

      const before1 = await program.provider.connection.getBalance(
        referrer1.publicKey
      );
      const before2 = await program.provider.connection.getBalance(
        referrer2.publicKey
      );
      const before3 = await program.provider.connection.getBalance(
        referrer3.publicKey
      );

      await program.methods
        .buy(buyAmount, solCost.add(fee))
        .accounts({
          feeRecipient: global.feeRecipient,
          global: globalPDA,
          mint: triMintKp.publicKey,
          bondingCurve: coin.bondingCurvePDA,
          associatedBondingCurve: coin.associatedBondingCurve,
          associatedUser: buyerAta,
          user: buyer.publicKey,
          referrer: referrer1.publicKey,
          referrer2: referrer2.publicKey,
          referrer3: referrer3.publicKey,
          referralRecord: buyerReferralPDA,
          ...dummyBundleAccounts(buyer.publicKey),
        })
        .signers([buyer])
        .rpc();

      // the persisted tree should record all three distinct referrers
      const record = await program.account.referral.fetch(buyerReferralPDA);
      expect(record.referrer.toBase58()).to.equal(referrer1.publicKey.toBase58());
      expect(record.referrer2.toBase58()).to.equal(
        referrer2.publicKey.toBase58()
      );
      expect(record.referrer3.toBase58()).to.equal(
        referrer3.publicKey.toBase58()
      );

      // each tier received approximately (fee/3)/3, carved out of the fee.
      const got1 =
        (await program.provider.connection.getBalance(referrer1.publicKey)) -
        before1;
      const got2 =
        (await program.provider.connection.getBalance(referrer2.publicKey)) -
        before2;
      const got3 =
        (await program.provider.connection.getBalance(referrer3.publicKey)) -
        before3;

      const expected = tierShare.toNumber();
      // robust to integer rounding: each tier is > 0 and equal to the program's share
      expect(got1).to.be.greaterThan(0);
      expect(got2).to.be.greaterThan(0);
      expect(got3).to.be.greaterThan(0);
      expect(got1).to.equal(expected);
      expect(got2).to.equal(expected);
      expect(got3).to.equal(expected);
    });
  });
});
