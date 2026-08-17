import { Module } from '@nestjs/common';
import { SolPriceController } from './sol-price.controller';
import { SolPriceService } from './sol-price.service';

@Module({
  controllers: [SolPriceController],
  providers: [SolPriceService],
  exports: [SolPriceService],
})
export class SolPriceModule {}
