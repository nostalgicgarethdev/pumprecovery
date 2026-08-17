import { Module } from '@nestjs/common';
import { GlobalParamsService } from './global-params.service';
import { DatabaseService } from 'src/database/database.service';

@Module({
  providers: [GlobalParamsService, DatabaseService],
  exports: [GlobalParamsService],
})
export class GlobalParamsModule {}
