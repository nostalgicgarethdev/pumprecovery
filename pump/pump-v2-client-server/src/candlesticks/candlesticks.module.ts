import { Module } from '@nestjs/common';
import { CandlesticksController } from './candlesticks.controller';
import { CandlesticksService } from './candlesticks.service';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CandlesticksController],
  providers: [CandlesticksService],
})
export class CandlesticksModule {}
