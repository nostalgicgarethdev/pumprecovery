import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { Throttle } from '@nestjs/throttler';

class BalancesIndexDto {
  address: string;
  mint: string;
}

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Post('/index')
  async index(@Body() balancesIndexDto: BalancesIndexDto) {
    const { address, mint } = balancesIndexDto;

    return this.balancesService.index(address, mint);
  }

  @Get(':address')
  async getBalances(
    @Param('address') address: string,
    @Query('offset') offset: number,
    @Query('limit') limit: number,
  ) {
    return this.balancesService.getBalances(
      address,
      Number(offset),
      Number(limit),
    );
  }
}
