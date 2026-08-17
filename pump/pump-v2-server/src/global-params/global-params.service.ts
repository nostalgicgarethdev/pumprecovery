import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { EventListenerService } from 'src/event-listener/event-listener.service';

@Injectable()
export class GlobalParamsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getGlobalParamsAtTimestamp(slot: number) {
    return this.databaseService.getGlobalParamsAtTimestamp(slot);
  }

  async upsertParams(event, slot, signature, tx) {
    const timestamp = tx ? tx.blockTime * 1000 : Date.now();

    const {
      initialVirtualTokenReserves,
      initialVirtualSolReserves,
      initialRealTokenReserves,
      tokenTotalSupply,
      feeBasisPoints,
    } = event;

    const globalParams = {
      slot,
      signature,
      initial_virtual_token_reserves: initialVirtualTokenReserves.toString(),
      initial_virtual_sol_reserves: initialVirtualSolReserves.toString(),
      initial_real_token_reserves: initialRealTokenReserves.toString(),
      token_total_supply: tokenTotalSupply.toString(),
      fee_basis_points: feeBasisPoints.toString(),
      timestamp,
    };

    await this.databaseService.upsertGlobalParams(globalParams);
  }
}
