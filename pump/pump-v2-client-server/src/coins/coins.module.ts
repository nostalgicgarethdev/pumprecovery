import { Module } from '@nestjs/common';
import { SolPriceModule } from 'src/sol-price/sol-price.module';
import { CoinsController } from './coins.controller';
import { CoinsService } from './coins.service';
import { DatabaseService } from 'src/database/database.service';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [SolPriceModule, AuthModule, DatabaseModule],
  controllers: [CoinsController],
  providers: [CoinsService],
  exports: [CoinsService],
})
export class CoinsModule {}
