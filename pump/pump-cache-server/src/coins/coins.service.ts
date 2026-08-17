import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { RedisService } from 'src/redis/redis.service';

const COINS_FILTERS = [
  {
    sort: 'last_trade_timestamp',
    includeNsfw: true,
    order: 'DESC',
  },
  {
    sort: 'last_trade_timestamp',
    includeNsfw: false,
    order: 'DESC',
  },
  {
    sort: 'last_trade_timestamp',
    includeNsfw: true,
    order: 'ASC',
  },
  {
    sort: 'last_trade_timestamp',
    includeNsfw: false,
    order: 'ASC',
  },
];

@Injectable()
export class CoinsService {
  constructor(
    private readonly redisService: RedisService,
    private readonly databaseService: DatabaseService,
  ) {
    COINS_FILTERS.map(({ sort, includeNsfw, order }) => {
      this.initCoins(sort, includeNsfw, order);
    });
  }

  async initCoins(sort: string, includeNsfw: boolean, order: string) {
    const limit = 50;
    const offset = 0;
    const searchTerm = '';
    const creator = '';

    const coins = await this.databaseService.getCoins(
      limit,
      offset,
      sort,
      includeNsfw,
      searchTerm,
      order,
      creator,
    );

    await this.redisService.client.set(
      `coins:${sort}:${includeNsfw}:${order}`,
      JSON.stringify(coins),
    );

    console.log(
      'init coins for ',
      `coins:${sort}:${includeNsfw}:${order}`,
      coins.length,
    );
  }

  async handleTradeCreated(trade: any) {
    const coinsStr = await this.redisService.client.get(
      `coins:last_trade_timestamp:true:DESC`,
    );

    const coins = JSON.parse(coinsStr || '[]');
    const index = coins.findIndex((coin) => coin.mint === trade.mint);
    if (index !== -1) {
      if (coins.length >= 50) coins.splice(index, 1);
    } else {
      if (coins.length >= 50) coins.pop();
    }
    coins.unshift(trade);

    await this.redisService.client.set(
      `coins:last_trade_timestamp:true:DESC`,
      JSON.stringify(coins),
    );

    if (!trade.nsfw) {
      const coinsStr = await this.redisService.client.get(
        `coins:last_trade_timestamp:false:DESC`,
      );

      const coins = JSON.parse(coinsStr || '[]');
      const index = coins.findIndex((coin) => coin.mint === trade.mint);
      if (index !== -1) {
        coins.splice(index, 1);
      } else {
        coins.pop();
      }
      coins.unshift(trade);

      await this.redisService.client.set(
        `coins:last_trade_timestamp:false:DESC`,
        JSON.stringify(coins),
      );
    }
  }

  async handleNsfwMarked(mint: string, nsfw: boolean) {
    if (!nsfw) return;

    // remove the coin from all filters that are non-nsfw and update coins that are nsfw
    COINS_FILTERS.forEach(async ({ sort, includeNsfw, order }) => {
      const coins = JSON.parse(await this.getCache(sort, includeNsfw, order));

      let updatedCoins;
      if (!includeNsfw) {
        updatedCoins = coins.filter((coin) => coin.mint !== mint);
      } else {
        updatedCoins = coins.map((coin) =>
          coin.mint === mint ? { ...coin, nsfw } : coin,
        );
      }

      await this.redisService.client.set(
        `coins:${sort}:${includeNsfw}:${order}`,
        JSON.stringify(updatedCoins),
      );
    });
  }

  async getCache(sort: string, includeNsfw: boolean, order: string) {
    return this.redisService.client.get(
      `coins:${sort}:${includeNsfw}:${order}`,
    );
  }
}
