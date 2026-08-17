import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket, io } from 'socket.io-client';
import { TradesGateway } from './trades.gateway';
import { DatabaseService } from 'src/database/database.service';

const MIN_UPDATE_DURATION = 300;

@Injectable()
export class TradesService {
  private socket: Socket; // Hold the socket instance
  private lastEmitTimestamp: number = Date.now();
  private latestTradeCache: { lastUpdate: number; trade: any };

  constructor(
    private readonly configService: ConfigService,
    private readonly tradesGateway: TradesGateway,
    private readonly databaseService: DatabaseService,
  ) {
    this.listen();
  }

  async listen() {
    console.log('starting trades listener');

    this.socket = io(this.configService.get('serverUrl'), {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // listen to websocket using socket.io
    this.socket.on('tradeCreated', (trade) => {
      if (Date.now() - MIN_UPDATE_DURATION > this.lastEmitTimestamp) {
        this.lastEmitTimestamp = Date.now();
        this.tradesGateway.server.emit('tradeCreated', trade);
      }

      this.tradesGateway.server.emit(`tradeCreated:${trade.mint}`, trade);
    });
  }

  async getLatestTrade() {
    const UPDATE_INTERVAL = 5_000;

    if (
      !this.latestTradeCache ||
      this.latestTradeCache.lastUpdate < Date.now() - UPDATE_INTERVAL
    ) {
      this.latestTradeCache = this.latestTradeCache || {
        lastUpdate: 0,
        trade: null,
      };
      this.latestTradeCache.lastUpdate = Date.now();
      this.latestTradeCache.trade = await this.databaseService.getLatestTrade();
    }

    return this.latestTradeCache.trade;
  }
}
