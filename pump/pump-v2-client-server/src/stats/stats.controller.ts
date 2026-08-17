import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Get('coin-flywheel')
  async coinFlywheel(@Query('mint') mint: string) {
    if (!mint) return { error: 'mint required' };
    return this.stats.coinFlywheel(mint);
  }

  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Get('orca-tvl')
  async orcaTvl(@Query('mint') mint: string) {
    if (!mint) return { error: 'mint required' };
    return this.stats.orcaTvl(mint);
  }

  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @Get('global')
  async global() {
    return this.stats.global();
  }

  // Airdrop "proof of spend" leaderboard — served here so mirrors with no Supabase
  // key still render the airdrop page (heavy full-trades scan; cached 2 min).
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('airdrop')
  async airdrop() {
    return this.stats.airdrop();
  }
}
