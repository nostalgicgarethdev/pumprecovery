import { Module } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { BalancesController } from './balances.controller';
import { SolProviderModule } from 'src/sol-provider/sol-provider.module';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [SolProviderModule, DatabaseModule],
  providers: [BalancesService],
  controllers: [BalancesController],
})
export class BalancesModule {}
