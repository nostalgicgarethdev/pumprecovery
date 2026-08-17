import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { DatabaseService } from 'src/database/database.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, DatabaseService],
})
export class MetricsModule {}
