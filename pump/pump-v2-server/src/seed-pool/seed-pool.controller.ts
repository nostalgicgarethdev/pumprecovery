import { Controller, Get, Param } from '@nestjs/common';
import { SeedPoolService } from './seed-pool.service';
import { PublicKey } from '@solana/web3.js';

@Controller('seed-pool')
export class SeedPoolController {
  //   constructor(private seedPoolService: SeedPoolService) {}
  //   @Get(':mint')
  //   seedPool(@Param('mint') mint: string) {
  //     return this.seedPoolService.migrateLiquidityToRaydium({
  //       mint: new PublicKey(mint),
  //     });
  //   }
}
