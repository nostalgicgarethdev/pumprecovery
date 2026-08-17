import { Module } from '@nestjs/common';
import { TradesService } from './trades.service';
import { DatabaseService } from 'src/database/database.service';
import { EventListenerService } from 'src/event-listener/event-listener.service';
import { CoinsService } from 'src/coins/coins.service';
import { CoinsModule } from 'src/coins/coins.module';
import { TradesGateway } from './trades.gateway';
import { SolPriceService } from 'src/sol-price/sol-price.service';
import { SolPriceModule } from 'src/sol-price/sol-price.module';

@Module({
  imports: [CoinsModule, SolPriceModule],
  providers: [TradesService, DatabaseService, TradesGateway],
  exports: [TradesService],
})
export class TradesModule {}
