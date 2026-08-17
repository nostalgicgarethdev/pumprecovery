import { DatabaseModule } from 'src/database/database.module';
import { SolProviderModule } from 'src/sol-provider/sol-provider.module';

import { Module } from '@nestjs/common';

import { SendTransactionController } from './send-transaction.controller';
import { SendTransactionService } from './send-transaction.service';

@Module({
  imports: [SolProviderModule, DatabaseModule],
  providers: [SendTransactionService],
  controllers: [SendTransactionController],
})
export class SendTransactionModule {}
