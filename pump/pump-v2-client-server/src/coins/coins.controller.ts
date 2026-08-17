import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CoinsService } from './coins.service';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

@Controller('coins')
export class CoinsController {
  constructor(private readonly coinsService: CoinsService) {}

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get('/king-of-the-hill')
  getKingOfTheHill(@Query('includeNsfw') includeNsfw: string) {
    const includeNsfwBool = includeNsfw === 'true';
    return this.coinsService.getCoinKingOfTheHill(includeNsfwBool);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get('/latest')
  getLatestCoin() {
    return this.coinsService.getLatest();
  }

  @Get(':mint')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  getOne(@Param('mint') mint: string) {
    return this.coinsService.getCoinByMint(mint);
  }

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  getAll(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Query('sort') sort: string,
    @Query('searchTerm') searchTerm: string,
    @Query('order') order: string,
    @Query('includeNsfw') includeNsfw: boolean,
    @Query('creator') creator: string,
  ) {
    limit = Math.min(50, limit);
    return this.coinsService.getAll(
      limit,
      offset,
      sort,
      order,
      includeNsfw,
      searchTerm,
      creator,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('mark-as-nsfw/:mint')
  markAsNsfw(
    @Param('mint') mint: string,
    @Body('nsfw') nsfw: boolean,
    @Req() req: any,
  ) {
    const { address } = req.user;
    return this.coinsService.markAsNsfw(mint, nsfw, address);
  }
}
