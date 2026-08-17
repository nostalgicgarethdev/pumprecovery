import { Controller, Get, Query } from '@nestjs/common';
import { EventListenerService } from './event-listener.service';
import { CoinsService } from 'src/coins/coins.service';
import { TradesService } from 'src/trades/trades.service';
import { CandlesticksService } from 'src/candlesticks/candlesticks.service';
import { GlobalParamsService } from 'src/global-params/global-params.service';

@Controller('event-listener')
export class EventListenerController {
  locking = false;

  constructor(
    private eventListenerService: EventListenerService,
    private coinsService: CoinsService,
    private tradesService: TradesService,
    private candlesticksService: CandlesticksService,
    private globalParamsService: GlobalParamsService,
  ) {}

  @Get('/index')
  async index(@Query('signature') signature: string, @Query('id') id: string) {
    if (id !== '88918') return;

    await this.eventListenerService
      .index(signature, [
        {
          callback: (event, slot, signature, tx) =>
            this.globalParamsService.upsertParams(event, slot, signature, tx),
          eventName: 'SetParamsEvent',
        },
        {
          callback: (event, slot, signature, tx) =>
            this.coinsService.createCoin(event, slot, signature, tx),
          eventName: 'CreateEvent',
        },
        {
          callback: async (event, slot, signature) =>
            this.tradesService.handleTradeCreatedEvent(event as any, signature),
          eventName: 'TradeEvent',
        },
        {
          callback: async (event, slot, signature) =>
            this.candlesticksService.handleTradeCreatedEvent(
              event as any,
              slot,
              true,
            ),
          eventName: 'TradeEvent',
        },
      ])
      .catch((e) => console.error('Failed to index', e, signature));
  }

  @Get('/backfill')
  async backfill(@Query('limit') limit: number) {

    if (this.locking) throw new Error('Already backfilling');

    this.locking = true;

    const numericLimit = Number(limit);
    const safeLimit =
      !isNaN(numericLimit) && numericLimit > 0 ? numericLimit : 1000;

    this.eventListenerService
      .backfillLogs(
        [
          {
            callback: (event, slot, signature, tx) =>
              this.coinsService.createCoin(event, slot, signature, tx),
            eventName: 'CreateEvent',
          },
          {
            callback: async (event, slot, signature) =>
              this.tradesService.handleTradeCreatedEvent(
                event as any,
                signature,
              ),
            eventName: 'TradeEvent',
          },
          {
            callback: async (event, slot, signature) =>
              this.candlesticksService.handleTradeCreatedEvent(
                event as any,
                slot,
                true,
              ),
            eventName: 'TradeEvent',
          },
        ],
        undefined,
        safeLimit,
      )
      .finally(() => {
        this.locking = false;
      });
  }
}
