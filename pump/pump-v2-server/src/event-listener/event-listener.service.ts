import {
  AnchorProvider,
  BorshCoder,
  EventParser,
  Idl,
  Program,
} from '@coral-xyz/anchor';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import pumpIdl from '../../idl/pump.json';
import WebSocket from 'ws';
import sleep from 'sleep-promise';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeRequestFilterAccountsFilter,
} from '@triton-one/yellowstone-grpc';
import { PingRequest } from '@triton-one/yellowstone-grpc/dist/grpc/geyser';

type EventCallback = (
  event: any,
  slot: number,
  signature: string,
  tx: any,
) => any;

let resss = {};
let maxValue = 0;

@Injectable()
export class EventListenerService {
  callbacks: Record<string, EventCallback[]> = {};
  finalizedCallbacks: Record<string, EventCallback[]> = {};
  loggedEvents: Set<string> = new Set();
  finalizedLoggedEvents: Set<string> = new Set();
  connection: Connection;

  constructor(private configService: ConfigService) {
    this.connection = new Connection(this.configService.get('solanaRpcUrl3'));

    console.log('starting listener');
    this.startLogsListener();
  }

  async emit(event: string, data: any) {
    const callbacks = this.callbacks[event];

    if (callbacks) {
      for (const callback of callbacks) {
        await callback(data, 0, '', {});
      }
    }
  }

  async onFinalized(event: string, callback: EventCallback) {
    if (!this.finalizedCallbacks[event]) this.finalizedCallbacks[event] = [];
    this.finalizedCallbacks[event].push(callback);
  }

  async on(event: string, callback: EventCallback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  async index(
    signature: string,
    callbacks: { callback: EventCallback; eventName: string }[],
  ) {
    const connection = new Connection(this.configService.get('solanaRpcUrl3'));

    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 2,
    });

    const eventParser = new EventParser(
      new PublicKey(this.configService.get('pumpProgramId') as string),
      new BorshCoder(pumpIdl as unknown as Idl),
    );

    const events = eventParser.parseLogs(tx.meta.logMessages);

    for (const event of events) {
      for (const { callback, eventName } of callbacks) {
        if (eventName === event.name) {
          await callback(event.data as any, tx.slot, signature, tx);
        }
      }
    }
  }

  async backfillLogs(
    callbacks: { callback: EventCallback; eventName: string }[],
    until?: string,
    limit: number = 1000,
  ) {
    const connection = new Connection(this.configService.get('solanaRpcUrl3'));
    const anchorProvider = new AnchorProvider(connection, null, {});
    const pumpProgram = new Program(
      pumpIdl as unknown as Idl,
      new PublicKey(this.configService.get('pumpProgramId') as string),
      anchorProvider,
    );

    let before: string | undefined = undefined;
    let allSignatures = [];
    let fetchedCount = 0;

    do {
      const batchSize = Math.min(limit - fetchedCount, 1000);
      const fetchedSignatures = await connection.getSignaturesForAddress(
        new PublicKey(this.configService.get('pumpProgramId')),
        {
          before,
          until,
          limit: batchSize,
        },
      );

      if (fetchedSignatures.length === 0) {
        break;
      }

      allSignatures = allSignatures.concat(fetchedSignatures);
      before = fetchedSignatures[fetchedSignatures.length - 1].signature;
      fetchedCount += fetchedSignatures.length;
    } while (fetchedCount < limit);

    allSignatures.reverse();

    const eventParser = new EventParser(
      pumpProgram.programId,
      new BorshCoder(pumpProgram.idl),
    );

    for (const { signature } of allSignatures) {
      const tx = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 2,
      });

      const events = eventParser.parseLogs(tx.meta.logMessages);

      for (const event of events) {
        for (const { callback, eventName } of callbacks) {
          if (eventName === event.name) {
            await callback(event.data as any, tx.slot, signature, tx);
          }
        }
      }
    }

    console.log(`Backfilled ${allSignatures.length} transactions`);
  }

  private async handleLogs(
    logs,
    context,
    commitment: CommitmentLevel = CommitmentLevel.CONFIRMED,
  ) {
    const signature = logs.signature;

    const loggedEvents =
      commitment === CommitmentLevel.FINALIZED
        ? this.finalizedLoggedEvents
        : this.loggedEvents;
    if (loggedEvents.has(signature)) {
      console.log(`Event already processed for signature: ${signature}`);
      return;
    }
    loggedEvents.add(signature);

    const eventParser = new EventParser(
      new PublicKey(this.configService.get('pumpProgramId')),
      new BorshCoder(pumpIdl as any),
    );

    let tx;
    const events = eventParser.parseLogs(logs.logs);
    for (const event of events) {
      const callbacks =
        commitment === CommitmentLevel.FINALIZED
          ? this.finalizedCallbacks[event.name]
          : this.callbacks[event.name];

      if (callbacks) {
        for (const callback of callbacks) {
          if (!tx) {
            tx = await this.connection
              .getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 2,
              })
              .catch((e) => {
                console.log('failed to fetch tx', e);
                return;
              });
          }

          await callback(event.data, context.slot, signature, tx);
        }
      }
    }
  }

  private async startGeyserStreamOnce(commitment: CommitmentLevel): Promise<never> {
    console.log(`Geyser stream starting for ${commitment}...`);

    const client = new Client(this.configService.get('solanaGeyserRpc'), '', {
      'grpc.max_receive_message_length': 64 * 1024 * 1024,
    });

    const stream = await client.subscribe();

    const id = Math.floor(Math.random() * 100_000);
    const defaultRequest = {
      accounts: {},
      slots: {},
      transactions: {},
      entry: {},
      blocks: {},
      blocksMeta: {},
      accountsDataSlice: [],
    };

    const transactionSubscribeRequest: SubscribeRequest = {
      ...defaultRequest,
      commitment,
      transactions: {
        client: {
          vote: false,
          failed: false,
          signature: undefined,
          accountInclude: [this.configService.get('pumpProgramId')],
          accountExclude: [],
          accountRequired: [],
        },
      },
    };

    const pingRequest: SubscribeRequest = {
      ...defaultRequest,
      ping: { id } as any,
    };

    return new Promise((_, reject) => {
      stream.on('data', (data) => {
        if (data.ping) {
          stream.write(pingRequest);
          return;
        }
        if (data.transaction) {
          const logs = data.transaction.transaction.meta.logMessages;
          const signature = bs58.encode(data.transaction.transaction.signature);
          const slot = Number(data.transaction.slot);
          this.handleLogs({ logs, signature }, { slot }, commitment);
        }
      });

      stream.on('ping', () => {});

      const die = (err?: any) => {
        try { stream.destroy(); } catch (e) {}
        reject(err || new Error('stream closed'));
      };

      stream.on('error', (err) => {
        console.error('Geyser grpc error', err);
        die(err);
      });
      stream.on('end', () => die());
      stream.on('close', () => die());

      stream.write(transactionSubscribeRequest, (err) => {
        if (err) die(err);
      });
    });
  }

  async startMainnetListenerWithReconnect(commitment: CommitmentLevel) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await this.startGeyserStreamOnce(commitment);
      } catch (e) {
        console.error(`Geyser ${commitment} stream died, reconnecting in 5s...`, (e as Error)?.message || e);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  async startDevnetListener() {
    console.log('Starting devnet listener');

    const setupListener = (connection) => {
      try {
        connection.onLogs(
          new PublicKey(this.configService.get('pumpProgramId')),
          (logs, context) => {
            this.handleLogs(logs, context);
          },
          'confirmed',
        );

        connection.onLogs(
          new PublicKey(this.configService.get('pumpProgramId')),
          (logs, context) => {
            this.handleLogs(logs, context);
          },
          'finalized',
        );
      } catch (e) {
        console.error('onLogs failed for connection with error: ', e);
      }
    };

    [
      this.configService.get('solanaRpcUrl2'),
      this.configService.get('solanaRpcUrl3'),
      this.configService.get('solanaRpcUrl4'),
      this.configService.get('solanaRpcUrl5'),
      this.configService.get('solanaRpcUrl6'),
      this.configService.get('solanaRpcUrl7'),
    ]
      .filter((v) => v)
      .map((urlParts) => {
        const [url, wsEndpoint] = urlParts.split(',');
        const config = {};
        if (wsEndpoint) {
          config['wsEndpoint'] = wsEndpoint;
        }
        console.log('connecting', url, config);
        const connection = new Connection(url, config);
        setupListener(connection);
      });
  }

  async startLogsListener() {
    console.log('Geyser RPC:', this.configService.get('solanaGeyserRpc'));
    if (this.configService.get('solanaGeyserRpc')) {
      this.startMainnetListenerWithReconnect(CommitmentLevel.CONFIRMED);
      this.startMainnetListenerWithReconnect(CommitmentLevel.FINALIZED);
    }
    // Always start RPC onLogs as backup (reliable for catching events even if geyser flakes)
    this.startDevnetListener();

    // const grpc = require('@grpc/grpc-js');
    // const protoLoader = require('@grpc/proto-loader');
    // const path = require('path');
    // // Assuming your .proto file is named "subscription.proto" and is located in the same directory
    // const PROTO_PATH = './src/event-listener/proto/geyser.proto';
    // // Load the .proto file
    // const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    //   keepCase: true,
    //   longs: String,
    //   enums: String,
    //   defaults: true,
    //   oneofs: true,
    // });
    // const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    // // Assuming the package name from your .proto file is 'geyser'
    // const geyser = protoDescriptor.geyser;
    // // Create a gRPC client
    // // Create a gRPC client
    // const client = new geyser.Geyser(
    //   'pump-fun-ac8sdv8.helius-rpc.com:4001',
    //   grpc.credentials.createInsecure(),
    // );
    // // Prepare your subscription request based on your .proto structure
    // const subscribeRequest = {
    //   transactions: {},
    // };
    // // Make the subscription call
    // const call = client.Subscribe();
    // call.on('data', function (response) {
    //   // Handle each response here
    //   console.log('Received message:', response);
    // });
    // call.on('end', function () {
    //   // The server has finished sending
    //   console.log('Server finished sending messages');
    // });
    // call.on('error', function (e) {
    //   // An error has occurred and the stream has been closed.
    //   console.error('Error:', e);
    // });
    // call.on('status', function (status) {
    //   // Process status
    //   console.log('Status:', status);
    // });
    // // Write your subscribeRequest to the call
    // call.write(subscribeRequest);
    // // End the call when you're done with the request
    // // You can also keep it open if you expect continuous updates
    // call.end();
    // const wsEndpoint = this.configService.get('solanaGeyserWsRpc1');
    // let ws;
    // const connectWebSocket = () => {
    //   ws = new WebSocket(wsEndpoint);
    //   ws.onopen = (event) => {
    //     console.log('WebSocket connection established');
    //     const rpcRequest = {
    //       jsonrpc: '2.0',
    //       id: 1,
    //       method: 'transactionSubscribe',
    //       params: [
    //         {
    //           vote: false,
    //           failed: false,
    //           accounts: {
    //             include: [this.configService.get('pumpProgramId')],
    //           },
    //         },
    //         {
    //           commitment: 'confirmed',
    //           encoding: 'base58',
    //           transactionDetails: 'full',
    //           showRewards: false,
    //           maxSupportedTransactionVersion: 1,
    //         },
    //       ],
    //     };
    //     ws.send(JSON.stringify(rpcRequest));
    //   };
    //   ws.onmessage = (event) => {
    //     const data = JSON.parse(event.data);
    //     if (data.method === 'transactionNotification') {
    //       const logs = data.params.result.value.transaction.meta.logMessages;
    //       const [serializedTx] =
    //         data.params.result.value.transaction.transaction;
    //       const {
    //         signatures: [signature],
    //       } = VersionedTransaction.deserialize(bs58.decode(serializedTx));
    //       const slot = data.params.result.value.slot;
    //       this.handleLogs(
    //         { logs, signature: bs58.encode(signature) },
    //         { slot },
    //       );
    //     }
    //   };
    //   ws.onerror = function (error) {
    //     console.error('WebSocket Error:', error);
    //   };
    //   ws.onclose = function (event) {
    //     console.log('WebSocket connection closed. Reconnecting...', event);
    //     // Reconnect after a short delay
    //     setTimeout(connectWebSocket, 3000);
    //   };
    // };
    // // Initial connection
    // connectWebSocket();
    // const setupListener = (connection) => {
    //   try {
    //     connection.onLogs(
    //       new PublicKey(this.configService.get('pumpProgramId')),
    //       (logs, context) => {
    //         this.handleLogs(logs, context);
    //       },
    //       'confirmed',
    //     );
    //     connection.onLogs(
    //       new PublicKey(this.configService.get('pumpProgramId')),
    //       (logs, context) => {
    //         this.handleLogs(logs, context);
    //       },
    //       'finalized',
    //     );
    //   } catch (e) {
    //     console.error('onLogs failed for connection with error: ', e);
    //   }
    // };
    // [
    //   this.configService.get('solanaRpcUrl2'),
    //   this.configService.get('solanaRpcUrl3'),
    //   this.configService.get('solanaRpcUrl4'),
    //   this.configService.get('solanaRpcUrl5'),
    //   this.configService.get('solanaRpcUrl6'),
    //   this.configService.get('solanaRpcUrl7'),
    // ]
    //   .filter((v) => v)
    //   .map((urlParts) => {
    //     const [url, wsEndpoint] = urlParts.split(',');
    //     const config = {};
    //     if (wsEndpoint) {
    //       config['wsEndpoint'] = wsEndpoint;
    //     }
    //     console.log('connecting', url, config);
    //     const connection = new Connection(url, config);
    //     setupListener(connection);
    //   });
  }
}
