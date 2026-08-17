import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SolProviderService } from 'src/sol-provider/sol-provider.service';

@Controller('jito-tips')
export class JitoTipsController {
  constructor(private readonly solProviderService: SolProviderService) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Get('/latest-block-hash')
  async getLatestBlockHash() {
    return this.solProviderService.dedicatedConnection.getLatestBlockhash(
      'finalized',
    );
  }
}
