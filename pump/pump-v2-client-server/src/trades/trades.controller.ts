import { Controller, Get, Param, Query } from '@nestjs/common';
import { TradesService } from './trades.service';
import { DatabaseService } from 'src/database/database.service';
import { Throttle } from '@nestjs/throttler';

@Controller('trades')
export class TradesController {
  constructor(
    private readonly tradesService: TradesService,
    private readonly databaseService: DatabaseService,
  ) {
    console.log('starting trades controller');
  }

  @Get('/latest')
  async getLatestTrade() {
    return this.tradesService.getLatestTrade();
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get(':mint')
  async getAllByMint(
    @Param('mint') mint: string,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    limit = Math.min(limit, 200);
    return this.databaseService.getTrades(mint, limit, offset);
  }
}
