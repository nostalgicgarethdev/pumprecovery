import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { BalancesModule } from 'src/balances/balances.module';
import { CandlesticksModule } from 'src/candlesticks/candlesticks.module';
import { CoinsModule } from 'src/coins/coins.module';
import { CommentsModule } from 'src/comments/comments.module';
import { TradesModule } from 'src/trades/trades.module';
import { GlobalParamsModule } from 'src/global-params/global-params.module';
import { SeedPoolModule } from 'src/seed-pool/seed-pool.module';

@Module({
  imports: [
    BalancesModule,
    CandlesticksModule,
    CoinsModule,
    CommentsModule,
    TradesModule,
    GlobalParamsModule,
    SeedPoolModule,
  ],
  providers: [OrchestratorService],
})
export class OrchestratorModule {}
