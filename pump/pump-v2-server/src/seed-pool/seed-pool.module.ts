import { Module } from '@nestjs/common';
import { SeedPoolService } from './seed-pool.service';
import { DatabaseService } from 'src/database/database.service';
import { EventListenerService } from 'src/event-listener/event-listener.service';
import { SeedPoolController } from './seed-pool.controller';

@Module({
  providers: [SeedPoolService, DatabaseService],
  exports: [SeedPoolService],
  // controllers: [SeedPoolController],
})
export class SeedPoolModule {}
