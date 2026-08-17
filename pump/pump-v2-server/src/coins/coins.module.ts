import { Module } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { DatabaseService } from 'src/database/database.service';
import { EventListenerService } from 'src/event-listener/event-listener.service';
import { SolPriceService } from 'src/sol-price/sol-price.service';
import { SolPriceModule } from 'src/sol-price/sol-price.module';
import { GlobalParamsModule } from 'src/global-params/global-params.module';
import { TradesModule } from 'src/trades/trades.module';
import { TradesGateway } from 'src/trades/trades.gateway';
import { CoinsGateway } from './coins.gateway';

@Module({
  imports: [SolPriceModule, GlobalParamsModule],
  providers: [CoinsService, DatabaseService, TradesGateway, CoinsGateway],
  exports: [CoinsService],
})
export class CoinsModule {}
