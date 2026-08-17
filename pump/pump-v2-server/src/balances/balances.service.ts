import { BN } from '@coral-xyz/anchor';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import sleep from 'sleep-promise';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class BalancesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async index(address: string, mint: string) {
    const associatedUser = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      new PublicKey(address),
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    const connection = new Connection(
      this.configService.get<string>('solanaRpcUrl3'),
    );

    const updateBalance = async () => {
      try {
        const balance = await connection
          .getTokenAccountBalance(associatedUser)
          .then((r) => r.value.amount);

        await this.databaseService.upsertBalance({
          address,
          mint,
          balance,
        });
      } catch (e) {
        console.log('failed to fetch balance:', mint, address, e);

        await this.databaseService.upsertBalance({
          address,
          mint,
          balance: '0',
        });
      }
    };

    setTimeout(async () => {
      updateBalance();
    }, 3_000);

    setTimeout(async () => {
      updateBalance();
    }, 15_000);

    setTimeout(async () => {
      updateBalance();
    }, 60_000);
  }
}
