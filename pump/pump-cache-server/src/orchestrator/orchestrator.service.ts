import { Injectable } from '@nestjs/common';
import { CoinsService } from 'src/coins/coins.service';
import { EventListenerService } from 'src/event-listener/event-listener.service';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly eventListenerService: EventListenerService,
    private readonly coinsService: CoinsService,
  ) {
    this.eventListenerService.on('tradeCreated', async (trade: any) => {
      await this.coinsService.handleTradeCreated(trade);
    });
  }
}
