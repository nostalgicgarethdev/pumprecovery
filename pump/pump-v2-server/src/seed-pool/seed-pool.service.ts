import {
  AnchorProvider,
  BN,
  Idl,
  Program,
  Wallet,
  utils,
} from '@coral-xyz/anchor';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AddressLookupTableProgram,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import pumpIdl from '../../idl/pump.json';
import { DatabaseService } from 'src/database/database.service';
import { EventListenerService } from 'src/event-listener/event-listener.service';
import sleep from 'sleep-promise';
import {
  Liquidity,
  MarketV2,
  SPL_ACCOUNT_LAYOUT,
  Token,
  TxVersion,
} from '@raydium-io/raydium-sdk';
import bs58 from 'bs58';
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createBurnInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

const MICRO_LAMPORTS_PRIORITY_FEE = 5_000_000;

@Injectable()
export class SeedPoolService {
  priorityFee: number = MICRO_LAMPORTS_PRIORITY_FEE;

  // listen to all complete events
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {
    if (this.configService.get('heliusRpcUrl')) {
      setInterval(() => {
        this.fetchPriorityFee();
      }, 10_000);
    }
  }

  async fetchPriorityFee() {
    try {
      const data = await fetch(
        this.configService.get('heliusRpcUrl') as string,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getPriorityFeeEstimate',
            params: [
              {
                accountKeys: [this.configService.get('pumpProgramId')],
              },
            ],
          }),
        },
      ).then((r) => r.json());

      if (data.error) throw new Error(data.error.message);

      this.priorityFee = Math.max(
        data.result.priorityFeeEstimate || 0,
        MICRO_LAMPORTS_PRIORITY_FEE,
      );
    } catch (e) {
      console.error('failed to fetch priority fee', e);
    }
  }

  async sendTransactionWithRetry(
    label: string,
    callback: (recentBlockhash: string) => Promise<string>,
  ) {
    console.log('submitting transaction:', label);

    const connection = new Connection(this.configService.get('solanaRpcUrl3'), {
      confirmTransactionInitialTimeout: 300_000,
    });

    const MAX_RETRIES = 30;
    const RETRY_INTERVAL = 10_000;
    const CONFIRMATION_TIMEOUT = 180_000;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const recentBlockhash = await connection
          .getLatestBlockhash('finalized')
          .then((v) => v.blockhash);

        const sig = await callback(recentBlockhash);

        // confirm the transaction here
        const start = Date.now();
        while (Date.now() < start + CONFIRMATION_TIMEOUT) {
          const status = await connection.getSignatureStatus(sig);
          console.log('transaction status:', label, sig, status);

          if (
            ['finalized', 'confirmed'].includes(
              status.value?.confirmationStatus,
            ) &&
            !status.value?.err
          ) {
            console.log('transaction confirmed:', label, sig, status);
            return sig;
          }

          await sleep(RETRY_INTERVAL);
        }

        // if the transaction is not confirmed after 200 seconds then retry the whole process again
        i = 0;
        throw Error(`Transaction failed to confirm ${sig}`);
      } catch (e) {
        console.log('error sending transaction:', label, e);
        await sleep(RETRY_INTERVAL);
      }
    }

    throw new Error('Failed to send transaction');
  }

  async sendTransaction(serializedTx: string) {
    await fetch(`${this.configService.get('clientApiUrl')}/send-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serializedTransaction: serializedTx,
        retries: 5,
      }),
    });

    // jito submission
    (async () => {
      const res = await fetch(
        'https://mainnet.block-engine.jito.wtf:443/api/v1/transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendTransaction',
            params: [serializedTx],
          }),
        },
      )
        .then((r) => r.json())
        .catch((e) => console.log('failed jito submission', e));

      console.log('jito submission', res);
    })();
  }

  async migrateLiquidityToRaydium(event: any) {
    console.log('complete event: ', event);
    const TRANSACTION_INTERVAL = 60_000;

    const { mint } = event;
    const migrationAuthorityKeyPair = Keypair.fromSecretKey(
      bs58.decode(this.configService.get('withdrawAuthorityPrivateKey')),
    );

    console.log(
      'migrating liquidity for mint:',
      migrationAuthorityKeyPair.publicKey.toBase58(),
      mint.toBase58(),
    );

    const coin = await this.databaseService.getCoinRaw(event.mint.toBase58());
    coin.complete = true;
    await this.databaseService.updateCoin(coin);

    const connection = new Connection(this.configService.get('solanaRpcUrl3'), {
      confirmTransactionInitialTimeout: 300_000,
    });
    const wallet = new Wallet(migrationAuthorityKeyPair);
    const anchorProvider = new AnchorProvider(connection, wallet, {});
    const pumpProgram = new Program(
      pumpIdl as unknown as Idl,
      new PublicKey(this.configService.get('pumpProgramId') as string),
      anchorProvider,
    );

    const lookupTableCache = {};
    const { innerTransactions, address } =
      await MarketV2.makeCreateMarketInstructionSimple({
        connection,
        dexProgramId: new PublicKey(
          this.configService.get('openBookProgramId'),
        ),
        baseInfo: {
          mint: new PublicKey('So11111111111111111111111111111111111111112'),
          decimals: 9,
        },
        quoteInfo: {
          mint,
          decimals: 6,
        },
        lotSize: 0.01,
        tickSize: 0.01,
        wallet: migrationAuthorityKeyPair.publicKey,
        makeTxVersion: TxVersion.V0,
        lookupTableCache,
      });

    await this.sendTransactionWithRetry(
      `openbook market 1 ${mint.toBase58()}`,
      async (recentBlockhash: string) => {
        const tx = new VersionedTransaction(
          new TransactionMessage({
            payerKey: migrationAuthorityKeyPair.publicKey,
            recentBlockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: MICRO_LAMPORTS_PRIORITY_FEE,
              }),
              ...innerTransactions[0].instructions,
            ],
          }).compileToV0Message(),
        );

        tx.sign([migrationAuthorityKeyPair]);
        await this.sendTransaction(bs58.encode(tx.serialize()));
        return bs58.encode(tx.signatures[0]);
      },
    );

    let lookupTableAddress: PublicKey;
    await this.sendTransactionWithRetry(
      `create lookup table for openbook tx 2 ${mint.toBase58()}`,
      async (recentBlockhash: string) => {
        const slot = await connection.getSlot();

        const [lookupTableInst, _lookupTableAddress] =
          AddressLookupTableProgram.createLookupTable({
            authority: migrationAuthorityKeyPair.publicKey,
            payer: migrationAuthorityKeyPair.publicKey,
            recentSlot: slot - 10,
          });

        lookupTableAddress = _lookupTableAddress;

        const extendInstruction = AddressLookupTableProgram.extendLookupTable({
          payer: migrationAuthorityKeyPair.publicKey,
          authority: migrationAuthorityKeyPair.publicKey,
          lookupTable: lookupTableAddress,
          addresses: [
            ...innerTransactions[1].instructions
              .map((i) => i.keys.map((v) => v.pubkey))
              .flat(),
          ],
        });

        const tx = new VersionedTransaction(
          new TransactionMessage({
            payerKey: migrationAuthorityKeyPair.publicKey,
            recentBlockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: MICRO_LAMPORTS_PRIORITY_FEE,
              }),
              lookupTableInst,
              extendInstruction,
            ],
          }).compileToV0Message(),
        );

        tx.sign([migrationAuthorityKeyPair]);
        await this.sendTransaction(bs58.encode(tx.serialize()));
        return bs58.encode(tx.signatures[0]);
      },
    );

    await sleep(TRANSACTION_INTERVAL);
    await this.sendTransactionWithRetry(
      `openbook market 2 ${mint.toBase58()}`,
      async (recentBlockhash: string) => {
        const lookupTableAccount = (
          await connection.getAddressLookupTable(lookupTableAddress)
        ).value;

        const tx = new VersionedTransaction(
          new TransactionMessage({
            payerKey: migrationAuthorityKeyPair.publicKey,
            recentBlockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: MICRO_LAMPORTS_PRIORITY_FEE,
              }),
              ...innerTransactions[1].instructions,
            ],
          }).compileToV0Message([lookupTableAccount]),
        );

        tx.sign([migrationAuthorityKeyPair]);
        await this.sendTransaction(bs58.encode(tx.serialize()));
        return bs58.encode(tx.signatures[0]);
      },
    );

    console.log('openbook market 2', mint.toBase58(), address);

    const associatedUser = getAssociatedTokenAddressSync(
      mint,
      migrationAuthorityKeyPair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    await this.sendTransactionWithRetry(
      `create associated account ${mint.toBase58()}`,
      async (recentBlockhash: string) => {
        const tx = new VersionedTransaction(
          new TransactionMessage({
            payerKey: migrationAuthorityKeyPair.publicKey,
            recentBlockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: MICRO_LAMPORTS_PRIORITY_FEE,
              }),
              createAssociatedTokenAccountInstruction(
                migrationAuthorityKeyPair.publicKey,
                associatedUser,
                migrationAuthorityKeyPair.publicKey,
                mint,
              ),
            ],
          }).compileToV0Message(),
        );

        tx.sign([migrationAuthorityKeyPair]);
        await this.sendTransaction(bs58.encode(tx.serialize()));
        return bs58.encode(tx.signatures[0]);
      },
    );

    await sleep(TRANSACTION_INTERVAL);
    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [utils.bytes.utf8.encode('bonding-curve'), mint.toBuffer()],
      pumpProgram.programId,
    );
    const bondingCurve =
      await pumpProgram.account.bondingCurve.fetch(bondingCurvePDA);
    const [globalPDA] = PublicKey.findProgramAddressSync(
      [utils.bytes.utf8.encode('global')],
      pumpProgram.programId,
    );
    const associatedBondingCurve = getAssociatedTokenAddressSync(
      mint,
      bondingCurvePDA,
      true,
      TOKEN_2022_PROGRAM_ID,
    );
    await this.sendTransactionWithRetry(
      `withdraw from bonding curve ${mint.toBase58()}`,
      async (recentBlockhash: string) => {
        const instruction = await pumpProgram.methods
          .withdraw()
          .accounts({
            global: globalPDA,
            mint,
            bondingCurve: bondingCurvePDA,
            associatedBondingCurve,
            associatedUser,
          })
          .instruction();

        const tx = new VersionedTransaction(
          new TransactionMessage({
            payerKey: migrationAuthorityKeyPair.publicKey,
            recentBlockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: MICRO_LAMPORTS_PRIORITY_FEE,
              }),
              instruction,
            ],
          }).compileToV0Message(),
        );

        tx.sign([migrationAuthorityKeyPair]);
        await this.sendTransaction(bs58.encode(tx.serialize()));
        return bs58.encode(tx.signatures[0]);
      },
    );

    await sleep(TRANSACTION_INTERVAL);
    const solReservesAvailable = (bondingCurve.realSolReserves as BN).sub(
      new BN(Number(this.configService.get('raydiumMigrationSolFee'))), // take a fee for ourselves
    );
    const tokenReservesAvailable = new BN(
      await connection
        .getTokenAccountBalance(associatedUser)
        .then((r) => r.value.amount),
    );

    console.log('sol reserves available:', solReservesAvailable.toString());
    console.log('token reserves available:', tokenReservesAvailable.toString());

    const quoteTokenUserAssociatedAccount =
      await connection.getAccountInfo(associatedUser);

    const rawResult = SPL_ACCOUNT_LAYOUT.decode(
      quoteTokenUserAssociatedAccount.data,
    );

    const {
      innerTransactions: createPoolInnerTransactions,
      address: liquidityAddress,
    } = await Liquidity.makeCreatePoolV4InstructionV2Simple({
      connection,
      programId: new PublicKey(
        this.configService.get('raydiumLiquidityPoolAmmProgramId'),
      ),
      marketInfo: {
        programId: new PublicKey(this.configService.get('openBookProgramId')),
        marketId: address.marketId,
      },
      associatedOnly: false,
      ownerInfo: {
        feePayer: migrationAuthorityKeyPair.publicKey,
        wallet: migrationAuthorityKeyPair.publicKey,
        useSOLBalance: true,
        tokenAccounts: [
          {
            programId: TOKEN_PROGRAM_ID,
            pubkey: associatedUser,
            accountInfo: rawResult,
          },
        ],
      },
      baseMintInfo: {
        mint: Token.WSOL.mint,
        decimals: 9,
      },
      quoteMintInfo: {
        mint,
        decimals: 6,
      },
      startTime: new BN(0),
      baseAmount: solReservesAvailable as BN,
      quoteAmount: tokenReservesAvailable as BN,

      checkCreateATAOwner: true,
      makeTxVersion: TxVersion.V0,
      lookupTableCache: {},
      feeDestinationId: new PublicKey(
        this.configService.get('raydiumFeeDestinationId'),
      ),
    });

    await this.sendTransactionWithRetry(
      `seed raydium pool ${mint.toBase58()}`,
      async (recentBlockhash: string) => {
        const tx = new VersionedTransaction(
          new TransactionMessage({
            payerKey: migrationAuthorityKeyPair.publicKey,
            recentBlockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: MICRO_LAMPORTS_PRIORITY_FEE,
              }),
              ...createPoolInnerTransactions[0].instructions,
            ],
          }).compileToV0Message(),
        );

        tx.sign([migrationAuthorityKeyPair]);
        await this.sendTransaction(bs58.encode(tx.serialize()));
        console.log('raydium pool info:', liquidityAddress);

        return bs58.encode(tx.signatures[0]);
      },
    );

    coin.raydium_pool = liquidityAddress.ammId.toBase58();
    coin.market_id = address.marketId.toBase58();
    coin.inverted = true;
    await this.databaseService.updateCoin(coin);

    await sleep(TRANSACTION_INTERVAL);

    // burn the tokens
    const lpMintAccount = getAssociatedTokenAddressSync(
      liquidityAddress.lpMint,
      migrationAuthorityKeyPair.publicKey,
      true,
    );

    console.log('lp mint account', lpMintAccount.toBase58());

    await this.sendTransactionWithRetry(
      `burn lp tokens ${mint.toBase58()}`,
      async (recentBlockhash: string) => {
        // get lp token balance
        const lpTokenBalance = await connection
          .getTokenAccountBalance(lpMintAccount)
          .then((v) => v.value.amount);

        console.log(
          'lpTokenBalance',
          lpTokenBalance,
          lpTokenBalance.toString(),
        );

        const tx = new VersionedTransaction(
          new TransactionMessage({
            payerKey: migrationAuthorityKeyPair.publicKey,
            recentBlockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: MICRO_LAMPORTS_PRIORITY_FEE,
              }),
              createBurnInstruction(
                lpMintAccount,
                liquidityAddress.lpMint,
                migrationAuthorityKeyPair.publicKey,
                Number(lpTokenBalance),
              ),
            ],
          }).compileToV0Message(),
        );

        tx.sign([migrationAuthorityKeyPair]);
        await this.sendTransaction(bs58.encode(tx.serialize()));
        return bs58.encode(tx.signatures[0]);
      },
    );
  }
}
