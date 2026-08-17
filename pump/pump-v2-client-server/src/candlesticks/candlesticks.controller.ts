import { Controller, Get, Param } from '@nestjs/common';
import { CandlesticksService } from './candlesticks.service';

@Controller('candlesticks')
export class CandlesticksController {
  constructor(private candlesticksService: CandlesticksService) {}

  @Get(':mint/:tf?')
  getAll(@Param('mint') mint: string, @Param('tf') tf?: string) {
    const interval = tf ? parseInt(tf, 10) : undefined;
    return this.candlesticksService.getAll(mint, interval);
  }
}
