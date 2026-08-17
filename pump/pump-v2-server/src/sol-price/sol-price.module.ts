import { Module } from '@nestjs/common';
import { SolPriceService } from './sol-price.service';

@Module({
  providers: [SolPriceService],
  exports: [SolPriceService],
})
export class SolPriceModule {}
