import { Module } from '@nestjs/common';
import { CandlesticksService } from './candlesticks.service';
import { DatabaseService } from 'src/database/database.service';
import { EventListenerService } from 'src/event-listener/event-listener.service';
import { GlobalParamsService } from 'src/global-params/global-params.service';
import { CoinsService } from 'src/coins/coins.service';
import { SolPriceService } from 'src/sol-price/sol-price.service';
import { CoinsModule } from 'src/coins/coins.module';

@Module({
  imports: [CoinsModule],
  providers: [
    CandlesticksService,
    DatabaseService,
    GlobalParamsService,
    SolPriceService,
  ],
  exports: [CandlesticksService],
})
export class CandlesticksModule {}
