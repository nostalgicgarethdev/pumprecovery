import { Module } from '@nestjs/common';
import { GlobalParamsService } from './global-params.service';
import { GlobalParamsController } from './global-params.controller';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [GlobalParamsService],
  controllers: [GlobalParamsController],
})
export class GlobalParamsModule {}
