import { Module } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { DatabaseService } from 'src/database/database.service';

@Module({
  providers: [BalancesService, DatabaseService],
  exports: [BalancesService],
})
export class BalancesModule {}
