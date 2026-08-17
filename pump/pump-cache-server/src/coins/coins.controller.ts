import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CoinsService } from './coins.service';

@Controller('coins')
export class CoinsController {
  constructor(private readonly coinsService: CoinsService) {}

  @Get('/')
  async getBumpOrderCache(
    @Query('sort') sort: string,
    @Query('includeNsfw') includeNsfw: boolean,
    @Query('order') order: string,
  ) {
    return this.coinsService.getCache(sort, includeNsfw, order);
  }

  @Post('mark-as-nsfw/:mint')
  async markAsNsfw(@Param('mint') mint: string, @Body('nsfw') nsfw: boolean) {
    this.coinsService.handleNsfwMarked(mint, nsfw);
  }
}
