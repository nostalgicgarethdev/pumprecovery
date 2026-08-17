import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GetCoinsDto } from './dto/get-coins.dto';
import { Program, AnchorProvider, Idl, utils } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';
import pumpIdl from '../../idl/pump.json';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { EventListenerService } from 'src/event-listener/event-listener.service';
import { BN } from '@coral-xyz/anchor';
import { Coin } from './entities/coin.entity';
import { SolPriceService } from 'src/sol-price/sol-price.service';
import { TradeEvent } from 'src/candlesticks/events/trade-created.event';
import { lamportsToSol } from 'utils/lamportsToSol';
import { GlobalParamsService } from 'src/global-params/global-params.service';
import sleep from 'sleep-promise';
import { TradesGateway } from 'src/trades/trades.gateway';
import { CoinsGateway } from './coins.gateway';

@Injectable()
export class CoinsService {
  private marketCapLastUpdate: Record<string, number> = {};

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
    private readonly globalParamsService: GlobalParamsService,
    private readonly coinsGateway: CoinsGateway,
  ) {}

  async getCoinByMint(mint: string) {
    return this.databaseService.getCoinByMint(mint);
  }

  async updateMarketCap(mint: string) {
    console.log('updating market', mint);
    const coin = await this.databaseService.getCoinRaw(mint);
    if (!coin) return;

    let marketCap;
    if (coin.raydium_pool) {
      const UPDATE_INTERVAL = 0;

      if (this.marketCapLastUpdate[coin.mint] + UPDATE_INTERVAL > Date.now()) {
        return;
      }

      this.marketCapLastUpdate[mint] = Date.now();

      // use dexscreener
      const priceNative = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${coin.mint}`,
      )
        .then((response) => response.json())
        .then((data) => {
          const priceNative = data.pairs[0].priceNative;
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
    }

    coin.market_cap = marketCap;
    await this.databaseService.updateCoin(coin);
  }

  async createCoin(event: any, slot: number, signature: string, tx: any) {
    console.log('creating coin - reindex improved ' + new Date().toISOString());
    const { name: eventName, symbol: eventSymbol, uri, mint, bondingCurve, user } = event;
    const timestamp = tx ? tx.blockTime * 1000 : Date.now();

    const fetchIpfsData = async () => {
      const proxyUrl = this.configService.get<string>('ipfsProxyUrl');

      // Prefer the IPFS proxy (hosted on reliable infra like Vercel) when configured.
      // Call as: GET ${proxyUrl}?uri=https://cf-ipfs.com/ipfs/...
      if (proxyUrl) {
        try {
          const sep = proxyUrl.includes('?') ? '&' : '?';
          const proxied = `${proxyUrl}${sep}uri=${encodeURIComponent(uri)}`;
          const res = await fetch(proxied, {
            signal: AbortSignal.timeout(12000),
            headers: { Accept: 'application/json, */*' },
          });
          if (res.ok) {
            // Proxy returns the raw body; parse as JSON for metadata.
            return await res.json();
          }
          console.log('ipfs-proxy non-ok', res.status, await res.text().catch(() => ''));
        } catch (e: any) {
          console.log('ipfs-proxy failed, will try direct gateways', e?.message || e);
        }
      }

      // Direct multi-gateway fallback (cf-ipfs.com often flakes on Heroku)
      const hash = uri.includes('/ipfs/') ? uri.split('/ipfs/')[1] : uri;
      const gateways = [
        `https://ipfs.io/ipfs/${hash}`,
        `https://gateway.pinata.cloud/ipfs/${hash}`,
        `https://cloudflare-ipfs.com/ipfs/${hash}`,
        uri.replace('cf-ipfs.com', 'ipfs.io'),
      ];
      for (const gw of gateways) {
        try {
          const res = await fetch(gw, { signal: AbortSignal.timeout(8000) });
          if (res.ok) return await res.json();
        } catch (e: any) {
          console.log('gateway failed', gw, e?.message || e);
        }
      }
      throw new Error('All IPFS gateways failed for ' + hash);
    };

    const fetchIpfsDataWithRetry = async () => {
      // Short retry for indexing to avoid blocking requests; fallback to event data
      const maxRetryDuration = 5000; // 5 seconds max
      const retryInterval = 1000;
      let elapsedTime = 0;

      while (elapsedTime < maxRetryDuration) {
        try {
          const data = await fetchIpfsData();
          return data;
        } catch (error) {
          console.log('Failed to fetch IPFS data, retrying...', error.message || error);
          await sleep(retryInterval);
          elapsedTime += retryInterval;
        }
      }

      console.log('IPFS fetch timed out quickly, using event name/symbol');
      return { description: '', image: '', telegram: '', twitter: '', website: '', showName: true };
    };

    try {
      // fetch the metadata from the uri in the event (name/symbol already in event)
      let data: any = {};
      try {
        data = await fetchIpfsDataWithRetry();
      } catch (error) {
        console.log(
          'failed to fetch ipfs data for coin, using name/symbol from event only',
          error,
          event,
        );
        // continue with defaults
      }

      const {
        description = '',
        image = '',
        telegram,
        twitter,
        website,
        showName,
      } = data;

      const associatedBondingCurve = getAssociatedTokenAddressSync(
        new PublicKey(mint),
        new PublicKey(bondingCurve),
        true,
        TOKEN_2022_PROGRAM_ID,
      );

      const params = await this.globalParamsService.getGlobalParamsAtTimestamp(timestamp);

      // Fallback defaults (from program init) if no global_params row yet (e.g. during early reindex or missing SetParams)
      // These are the values passed to SetParamsEvent on program init
      const ivsr = params?.initial_virtual_sol_reserves ?? '30000000000';
      const ivtr = params?.initial_virtual_token_reserves ?? '1073000000000000';
      const tts = params?.token_total_supply ?? '1000000000000000';

      const market_cap = await this.calculateMarketCap(ivsr, ivtr, tts);

      await this.databaseService.createCoin({
        name: eventName,
        symbol: eventSymbol,
        description: description && description.replace(/[\r\n]+/g, ' '),
        image_uri: image,
        metadata_uri: uri,
        bonding_curve: bondingCurve,
        associated_bonding_curve: associatedBondingCurve.toBase58(),
        mint,
        creator: user,
        created_timestamp: timestamp,
        twitter,
        telegram,
        website,
        complete: false,
        virtual_sol_reserves: ivsr,
        virtual_token_reserves: ivtr,
        total_supply: tts,
        show_name: showName ?? true,
        market_cap,
      });

      // Seed initial candlesticks (for different intervals) so the chart has data from creation time
      // even if first trades are small or pending. Uses same price calc as candle listener.
      try {
        const intervals = [1, 5 * 60, 15 * 60];
        const ivsr = params?.initial_virtual_sol_reserves ?? '30000000000';
        const ivtr = params?.initial_virtual_token_reserves ?? '1073000000000000';
        const initialPrice =
          new BN(ivsr).mul(new BN(10 ** 9)).div(new BN(ivtr)).toNumber() / 10 ** 9 / 10 ** 3;

        // use blockTime in seconds for candle timestamp consistency
        const createSec = tx ? tx.blockTime : Math.floor(Date.now() / 1000);
        for (const interval of intervals) {
          const candleTimestamp = Math.floor(createSec / interval) * interval;
          const initialCandle = {
            mint,
            timestamp: candleTimestamp,
            open: initialPrice,
            high: initialPrice,
            low: initialPrice,
            close: initialPrice,
            volume: 0,
            slot: slot || 0,
          };
          await this.databaseService.upsertCandlestick(initialCandle as any, interval);
        }
        console.log(`seeded initial candlesticks for ${mint}`);
      } catch (seedErr) {
        console.log('failed to seed initial candles for chart', seedErr);
      }
    } catch (e) {
      console.log('ERROR creating:', event, e);
      return;
    }
  }

  async updateKingOfHillStatus(tradeEvent: TradeEvent) {
    if (tradeEvent.solAmount.lt(new BN(5000000))) return; // keep higher threshold for king (significant trades only)

    console.log('updating king of hill', tradeEvent);

    const coin = await this.databaseService.getCoinRaw(
      tradeEvent.mint.toBase58(),
    );

    const { virtualSolReserves, virtualTokenReserves, tokenTotalSupply } =
      await this.getBondingCurveDetails(new PublicKey(coin.bonding_curve));

    const marketCap = virtualSolReserves
      .mul(tokenTotalSupply)
      .div(virtualTokenReserves);

    if (
      marketCap.gte(new BN(this.configService.get('kingOfTheHillMarketCap'))) &&
      !coin.king_of_the_hill_timestamp
    ) {
      console.log('crowning coin as king of the hill', coin);
      coin.king_of_the_hill_timestamp = Date.now();
      await this.databaseService.updateCoin(coin);
      this.coinsGateway.emitNewKingOfTheHill(coin);
    }
  }

  async updateCoinLastTradeTimestamp(tradeEvent: TradeEvent) {
    if (tradeEvent.solAmount.lt(new BN(1000))) return; // lowered for small trades (was 5M)

    console.log('updating', tradeEvent.mint.toBase58());
    const coin = await this.databaseService.getCoinRaw(
      tradeEvent.mint.toBase58(),
    );
    coin.last_trade_timestamp = Date.now();
    await this.databaseService.updateCoin(coin);
  }

  async getBondingCurveDetails(bondingCurveId: PublicKey): Promise<any> {
    const connection = new Connection(
      this.configService.get<string>('solanaRpcUrl3'),
    );
    const wallet = null;
    const anchorProvider = new AnchorProvider(connection, wallet as any, {});
    const pumpProgram = new Program(
      pumpIdl as unknown as Idl,
      new PublicKey(this.configService.get<string>('pumpProgramId')),
      anchorProvider,
    );

    const bondingCurve =
      await pumpProgram.account.bondingCurve.fetch(bondingCurveId);
    return bondingCurve;
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
}
