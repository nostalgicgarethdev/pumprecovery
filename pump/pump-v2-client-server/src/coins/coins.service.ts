import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { SolPriceService } from 'src/sol-price/sol-price.service';
import { BN } from '@coral-xyz/anchor';
import { lamportsToSol } from 'src/utils/lamportsToSol';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class CoinsService {
  private market_cap_last_update: Record<string, number> = {};
  private latestCoinCache: { lastUpdate: number; coin: any };
  private coinsCache: Record<
    string,
    Record<string, Record<number, { lastUpdate: number; coins: any }>>
  >;
  private kingOfTheHillCache: Record<number, { lastUpdate: number; coin: any }>;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly solPriceService: SolPriceService,
    private readonly authService: AuthService,
  ) {}

  async getCoinByMint(mint: string) {
    const coin = await this.databaseService.getCoinByMint(mint);
    const { solPrice } = this.solPriceService.getPrice();
    coin.usd_market_cap = coin.market_cap * solPrice;

    this.updateMarketCap(mint).catch((e) =>
      console.error('failed to update market cap:', mint, e),
    );

    return coin;
  }

  async updateMarketCap(mint: string) {
    const coin = await this.databaseService.getCoinRaw(mint);
    if (!coin) return;

    let marketCap;
    if (coin.raydium_pool) {
      const UPDATE_INTERVAL = 15_000;

      if (
        this.market_cap_last_update[coin.mint] + UPDATE_INTERVAL >
        Date.now()
      ) {
        return;
      }

      this.market_cap_last_update[coin.mint] = Date.now();

      // use dexscreener
      const priceNative = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${coin.mint}`,
      )
        .then((response) => response.json())
        .then((data) => {
          const targetPair =
            data.pairs.find((v) => v.pairAddress === coin.raydium_pool) ||
            data.pairs[0];

          const priceNative = targetPair.priceNative;
          return priceNative;
        });

      marketCap =
        priceNative *
        Number(new BN(coin.total_supply).div(new BN(10 ** 6)).toString());
    } else {
      marketCap = await this.calculateMarketCap(
        coin.virtual_sol_reserves,
        coin.virtual_token_reserves,
        coin.total_supply,
      );

      if (coin.market_cap == marketCap) return;
    }

    coin.market_cap = marketCap;
    await this.databaseService.updateCoin(coin);
  }

  async getAll(
    limit: number,
    offset: number,
    sort: string,
    order: string,
    includeNsfw: boolean,
    searchTerm?: string,
    creator?: string,
  ) {
    const UPDATE_INTERVAL = 5_000;

    let coins;
    if (
      Number(limit) === 50 &&
      Number(offset) === 0 &&
      !searchTerm &&
      !creator
    ) {
      if (
        !this.coinsCache ||
        !this.coinsCache[sort] ||
        !this.coinsCache[sort][order] ||
        !this.coinsCache[sort][order][Boolean(includeNsfw) ? 1 : 0] ||
        this.coinsCache[sort][order][Boolean(includeNsfw) ? 1 : 0].lastUpdate <
          Date.now() - UPDATE_INTERVAL
      ) {
        this.coinsCache = this.coinsCache || {};
        this.coinsCache[sort] = this.coinsCache[sort] || {};
        this.coinsCache[sort][order] = this.coinsCache[sort][order] || {};
        this.coinsCache[sort][order][Boolean(includeNsfw) ? 1 : 0] =
          this.coinsCache[sort][order][Boolean(includeNsfw) ? 1 : 0] ||
          ({} as any);

        this.coinsCache[sort][order][Boolean(includeNsfw) ? 1 : 0].lastUpdate =
          Date.now();
        this.coinsCache[sort][order][Boolean(includeNsfw) ? 1 : 0].coins =
          await this.databaseService.getCoins(
            limit,
            offset,
            sort,
            includeNsfw,
            searchTerm,
            order,
            creator,
          );
      }

      coins = this.coinsCache[sort][order][Boolean(includeNsfw) ? 1 : 0].coins;
    } else {
      coins = await this.databaseService.getCoins(
        limit,
        offset,
        sort,
        includeNsfw,
        searchTerm,
        order,
        creator,
      );
    }

    const fetchedSolPrice = await this.solPriceService.getPrice();

    if (coins == null) return;

    return coins.map((coin) => {
      coin.usd_market_cap = coin.market_cap * fetchedSolPrice.solPrice;
      return coin;
    });
  }

  async getCoinKingOfTheHill(includeNsfw: boolean) {
    const UPDATE_INTERVAL = 5_000;

    if (
      !this.kingOfTheHillCache ||
      !this.kingOfTheHillCache[Boolean(includeNsfw) ? 1 : 0] ||
      this.kingOfTheHillCache[Boolean(includeNsfw) ? 1 : 0].lastUpdate <
        Date.now() - UPDATE_INTERVAL
    ) {
      this.kingOfTheHillCache = this.kingOfTheHillCache || {};
      this.kingOfTheHillCache[Boolean(includeNsfw) ? 1 : 0] =
        this.kingOfTheHillCache[Boolean(includeNsfw) ? 1 : 0] || ({} as any);
      this.kingOfTheHillCache[Boolean(includeNsfw) ? 1 : 0].lastUpdate =
        Date.now();
      this.kingOfTheHillCache[Boolean(includeNsfw) ? 1 : 0].coin =
        await this.databaseService.getCoinKingOfTheHill(includeNsfw);
    }

    const { coin } = this.kingOfTheHillCache[Boolean(includeNsfw) ? 1 : 0];

    try {
      const fetchedSolPrice = await this.solPriceService.getPrice();
      coin.usd_market_cap = coin.market_cap * fetchedSolPrice.solPrice;
    } catch (e) {
      console.error('error fetching market cap', e);
      coin.usd_market_cap = 0;
    }

    return coin;
  }

  async getLatest() {
    const UPDATE_INTERVAL = 5_000;

    if (
      !this.latestCoinCache ||
      this.latestCoinCache.lastUpdate < Date.now() - UPDATE_INTERVAL
    ) {
      this.latestCoinCache = this.latestCoinCache || {
        lastUpdate: 0,
        coin: null,
      };

      this.latestCoinCache.lastUpdate = Date.now();
      this.latestCoinCache.coin = await this.databaseService.getLatestCoin();
    }

    return this.latestCoinCache.coin;
  }

  async calculateMarketCap(
    virtualSolReserves: string,
    virtualTokenReserves: string,
    tokenTotalSupply: string,
  ): Promise<number> {
    const marketCapBN = new BN(tokenTotalSupply)
      .mul(new BN(virtualSolReserves))
      .div(new BN(virtualTokenReserves));

    return lamportsToSol(marketCapBN);
  }

  async markAsNsfw(mint: string, nsfw: boolean, address: string) {
    // check that the address is in the admin table
    const isAdmin = await this.authService.isAdmin(address);
    if (!isAdmin) throw new Error('Not admin');

    const coin = await this.databaseService.getCoinRaw(mint);
    await this.databaseService.updateCoin({ ...coin, nsfw });
  }
}
