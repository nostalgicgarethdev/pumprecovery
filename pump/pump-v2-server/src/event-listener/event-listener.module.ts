import { Global, Module } from '@nestjs/common';
import { EventListenerService } from './event-listener.service';
import { EventListenerController } from './event-listener.controller';
import { CoinsService } from 'src/coins/coins.service';
import { CandlesticksService } from 'src/candlesticks/candlesticks.service';
import { TradesService } from 'src/trades/trades.service';
import { DatabaseService } from 'src/database/database.service';
import { SolPriceService } from 'src/sol-price/sol-price.service';
import { CoinsModule } from 'src/coins/coins.module';
import { TradesModule } from 'src/trades/trades.module';
import { CandlesticksModule } from 'src/candlesticks/candlesticks.module';
import { GlobalParamsModule } from 'src/global-params/global-params.module';

@Global()
@Module({
  providers: [EventListenerService],
  controllers: [EventListenerController],
  imports: [CoinsModule, TradesModule, CandlesticksModule, GlobalParamsModule],
  exports: [EventListenerService],
})
export class EventListenerModule {}
