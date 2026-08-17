import { BN } from '@coral-xyz/anchor';
import { Injectable } from '@nestjs/common';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { DatabaseService } from 'src/database/database.service';
import { SolProviderService } from 'src/sol-provider/sol-provider.service';
import { humanizeTokenAmount } from 'src/utils/humanizeTokenAmount';

@Injectable()
export class BalancesService {
  constructor(
    private readonly solProviderService: SolProviderService,
    private readonly databaseService: DatabaseService,
  ) {}

  async index(address: string, mint: string) {
    const associatedUser = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      new PublicKey(address),
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    const balance = await this.solProviderService.connection
      .getTokenAccountBalance(associatedUser)
      .then((r) => r.value.amount)
      .catch((e) => {
        console.log('failed to fetch balance', address, mint, e);

        return 0;
      });

    await this.databaseService.upsertBalance({
      address,
      mint,
      balance,
    });

    return { address, mint, balance };
  }

  async getBalances(address: string, offset: number, limit: number) {
    return this.databaseService.getBalances(address, offset, limit);
  }
}
