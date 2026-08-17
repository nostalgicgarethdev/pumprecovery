import { Module } from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradesGateway } from './trades.gateway';
import { TradesController } from './trades.controller';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TradesController],
  providers: [TradesService, TradesGateway, TradesController],
  exports: [TradesService],
})
export class TradesModule {}
