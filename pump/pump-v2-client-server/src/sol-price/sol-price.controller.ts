import { Controller, Get } from '@nestjs/common';
import { SolPriceService } from './sol-price.service';
import { Throttle } from '@nestjs/throttler';

@Controller('sol-price')
export class SolPriceController {
  constructor(private solPriceService: SolPriceService) {}

  @Get()
  // cached on server (15m), allow frequent reads from many clients
  @Throttle({ default: { ttl: 60_000, limit: 300 } })
  getPrice() {
    return this.solPriceService.getPrice();
  }
}
