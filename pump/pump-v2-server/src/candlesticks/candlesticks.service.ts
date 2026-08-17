import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateTradeDto } from './dto/create-trade.dto';
import { DatabaseService } from 'src/database/database.service';
import { Connection, PublicKey } from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';
import {
  AnchorProvider,
  BN,
  BorshCoder,
  EventParser,
  Idl,
  Program,
  utils,
} from '@coral-xyz/anchor';
import pumpIdl from '../../idl/pump.json';
import { TradeEvent } from './events/trade-created.event';
import { Candlestick } from './entities/candlestick.entity';
import { EventListenerService } from 'src/event-listener/event-listener.service';
import { GlobalParamsService } from 'src/global-params/global-params.service';
import { CoinsService } from 'src/coins/coins.service';

@Injectable()
export class CandlesticksService {
  candles: Record<string, Candlestick> = {};

  constructor(
    private databaseService: DatabaseService,
    private readonly globalParamsService: GlobalParamsService,
    private readonly coinsService: CoinsService,
  ) {}

  async handleTradeCreatedEvent(
    event: TradeEvent,
    slot: number,
    backfill?: boolean,
  ) {
    if (event.solAmount.lt(new BN(1000))) return; // allow even tiny trades for chart
    return this.candleListener([1, 5 * 60, 15 * 60], event, slot, backfill);
  }

  async candleListener(
    intervals: number[],
    event: TradeEvent,
    slot: number,
    backfill?: boolean,
  ) {

    let price = 0;
    if (event.virtualSolReserves.gt(new BN(0))) {
      const _solReserves = event.virtualSolReserves.toNumber() / 10 ** 9;
      const _tokenReserves = event.virtualTokenReserves.toNumber() / 10 ** 6;
      price = _solReserves / _tokenReserves;
    } else {
      const _solAmount = event.solAmount.toNumber() / 10 ** 9;
      const _tokenAmount = event.tokenAmount.toNumber() / 10 ** 6;
      price = _solAmount / _tokenAmount;
    }

    for (const interval of intervals) {
        
      const candleTimestamp =
        Math.floor(event.timestamp.toNumber() / interval) * interval;

      console.log(
        `Getting latest candlestick for event: ${event.mint.toBase58()} at ${new Date().toISOString()}`,
      );

      const latestCandlestick = await this.databaseService.getLatestCandlestick(
        event.mint.toBase58(),
        candleTimestamp,
        interval
      );

      if (latestCandlestick) {
        console.log(
          `Got latest candlestick: ${
            (latestCandlestick.mint,
            latestCandlestick.timestamp,
            latestCandlestick.close)
          } for event: ${event.mint.toBase58()} at ${new Date().toISOString()}`,
        );
      }

      console.log(
        `Checking if candlestick already exists for event: ${event.mint.toBase58()} at ${new Date().toISOString()}`,
      );
      let candlestick = await this.databaseService.getCandleStick(
        event.mint.toBase58(),
        candleTimestamp,
        interval
      );

      console.log(
        `Checked if candlestick for event: ${event.mint.toBase58()} at ${new Date().toISOString()} existed. Found: ${candlestick}`,
      );

      if (candlestick === null) {
        console.log('null candlestick');
        let initialPrice = latestCandlestick?.close;

        if (!initialPrice) {
          const coin = await this.coinsService.getCoinByMint(
            event.mint.toBase58(),
          );
          const params = await this.globalParamsService.getGlobalParamsAtTimestamp(
              1711112108000
            );
          const initial_virtual_sol_reserves = params?.initial_virtual_sol_reserves ?? '30000000000';
          const initial_virtual_token_reserves = params?.initial_virtual_token_reserves ?? '1073000000000000';

          initialPrice =
            new BN(initial_virtual_sol_reserves)
              .mul(new BN(10 ** 9))
              .div(new BN(initial_virtual_token_reserves))
              .toNumber() /
            10 ** 9 /
            10 ** 3;
        }

        candlestick = {
          high: price,
          open: initialPrice,
          close: price,
          low: initialPrice,
          volume: event.solAmount.toNumber(),
          timestamp: candleTimestamp,
          mint: event.mint.toBase58(),
          slot,
        };
      }

      if (price > candlestick.high) {
        candlestick.high = price;
      }

      if (price < candlestick.low) {
        candlestick.low = price;
      }

      candlestick.close = price;

      // skip updating volume if we are backfilling candles
      if (!backfill) candlestick.volume += event.solAmount.toNumber();

      if (Number.isNaN(price)) {
        console.log('price is NaN');
        console.log(
          candlestick,
          event.virtualSolReserves.toString(),
          event.virtualTokenReserves.toString(),
        );
      }

      const nextCandlestick = await this.databaseService.getNextCandlestick(
        event.mint.toBase58(),
        candleTimestamp,
        interval
      );

      if (nextCandlestick) {
        nextCandlestick.open = price;

        if (price > candlestick.high) {
          candlestick.high = price;
        }

        if (price < candlestick.low) {
          candlestick.low = price;
        }

        await this.databaseService.upsertCandlestick(nextCandlestick, interval);
      }

      await this.databaseService.upsertCandlestick(candlestick, interval);
    }
  }
}
