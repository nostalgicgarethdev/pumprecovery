import fetch from 'node-fetch';
import { DatabaseService } from 'src/database/database.service';
import { SolProviderService } from 'src/sol-provider/sol-provider.service';

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VersionedTransaction } from '@solana/web3.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SendTransactionService {
  constructor(
    private readonly configService: ConfigService,
    private readonly solProviderService: SolProviderService,
    private readonly databaseService: DatabaseService,
  ) {}

  async sendTransaction(serializedTransaction: string, retries: number) {
    const baseUrls = [
      this.configService.get('solanaRpcUrl2'),
      this.configService.get('solanaRpcUrl3'),
      this.configService.get('solanaRpcUrl4'),
      this.configService.get('solanaRpcUrl5'),
      this.configService.get('solanaRpcUrl6'),
    ].filter((v) => v);

    const urls = [];
    const signature = bs58.encode(
      VersionedTransaction.deserialize(bs58.decode(serializedTransaction))
        .signatures[0],
    );

    for (let i = 0; i < retries; i++) {
      urls.push(...baseUrls);
    }

    urls.map(async (url, index) => {
      setTimeout(async () => {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendTransaction',
            params: [serializedTransaction],
          }),
        })
          .then((r) => r.json())
          .catch((e) => console.log('could not submit transaction', e));
      }, index * 550);
    });

    const connection = this.solProviderService.connection;
    const slot = await connection.getSlot();
    if (signature != null) {
      await this.databaseService.upsertTxTracking({
        signature: signature,
        submitted_slot: slot,
      });
    }

    const latestBlockHash = await connection.getLatestBlockhash();
    connection
      .confirmTransaction(
        {
          signature: signature,
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        },
        'finalized',
      )
      .then(async (v: any) => {
        await this.databaseService.upsertTxTracking({
          signature: signature,
          confirmed_slot: v?.context.slot,
        });
      })
      .catch((e) => {
        console.error('error', e);
      });

    return;
  }
}
