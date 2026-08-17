import { Module } from '@nestjs/common';
import { SolProviderService } from './sol-provider.service';

@Module({
  providers: [SolProviderService],
  exports: [SolProviderService],
})
export class SolProviderModule {}
