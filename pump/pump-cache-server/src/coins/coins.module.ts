import { Module } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { RedisModule } from 'src/redis/redis.module';
import { DatabaseModule } from 'src/database/database.module';
import { CoinsController } from './coins.controller';

@Module({
  imports: [RedisModule, DatabaseModule],
  providers: [CoinsService],
  exports: [CoinsService],
  controllers: [CoinsController],
})
export class CoinsModule {}
