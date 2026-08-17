import { Injectable } from '@nestjs/common';
import { BalancesService } from 'src/balances/balances.service';
import { CandlesticksService } from 'src/candlesticks/candlesticks.service';
import { CoinsService } from 'src/coins/coins.service';
import { CommentsService } from 'src/comments/comments.service';
import { EventListenerService } from 'src/event-listener/event-listener.service';
import { GlobalParamsService } from 'src/global-params/global-params.service';
import { SeedPoolService } from 'src/seed-pool/seed-pool.service';
import { TradesService } from 'src/trades/trades.service';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly eventListenerService: EventListenerService,
    private readonly balancesService: BalancesService,
    private readonly candlesticksService: CandlesticksService,
    private readonly coinsService: CoinsService,
    private readonly commentsService: CommentsService,
    private readonly tradesService: TradesService,
    private readonly globalParamsService: GlobalParamsService,
    private readonly seedPoolService: SeedPoolService,
  ) {
    this.orchestrate();
  }

  async orchestrate() {
    console.log('starting orchestration');

    this.eventListenerService.on(
      'TradeEvent',
      async (event, slot, signature) => {
        await this.handleTradeEvent(event, slot, signature);
      },
    );

    this.eventListenerService.on(
      'CreateEvent',
      async (event, slot, signature, tx) => {
        await this.coinsService
          .createCoin(event, slot, signature, tx)
          .catch((e) => console.error('failed to create coin', e));
      },
    );

    this.eventListenerService.on(
      'SetParamsEvent',
      async (event, slot, signature, tx) => {
        await this.globalParamsService
          .upsertParams(event, slot, signature, tx)
          .catch((e) => console.log('failed to update params', e));
      },
    );

    // listen to completions of bonding curves
    this.eventListenerService.onFinalized(
      'CompleteEvent',
      async (event: any) => {
        await this.seedPoolService
          .migrateLiquidityToRaydium(event)
          .catch((e) => console.log('failed to do migration', event, e));
      },
    );
  }

  async handleTradeEvent(event, slot, signature) {
    await this.tradesService
      .handleTradeCreatedEvent(event as any, signature)
      .catch((e) => console.error('failed to process trade event', e));

    await this.candlesticksService
      .handleTradeCreatedEvent(event as any, slot)
      .catch((e) => console.log('failed to update candle', e));

    await this.coinsService
      .updateMarketCap(event.mint.toBase58())
      .catch((e) => console.log('failed to update market cap', e));

    await this.coinsService
      .updateCoinLastTradeTimestamp(event as any)
      .catch((e) => console.error('failed to update bump', e));

    await this.coinsService
      .updateKingOfHillStatus(event as any)
      .catch((e) => console.error('failed to update king of the hill', e));

    await this.commentsService
      .handleUpdateComment(event as any, signature)
      .catch((e) => console.error('failed to update comment', e));

    await this.balancesService
      .index(event.user.toBase58(), event.mint.toBase58())
      .catch((e) => console.log('failed to update balance', e));
  }
}
