import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket, io } from 'socket.io-client';

@Injectable()
export class EventListenerService {
  socket: Socket;
  callbacks: Record<string, ((event: any) => Promise<void>)[]> = {};

  constructor(private readonly configService: ConfigService) {
    this.socket = io(this.configService.get('serverUrl'), {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // listen to websocket using socket.io
    this.socket.on('tradeCreated', (trade) => {
      this.callbacks['tradeCreated']?.forEach(async (callback) => {
        await callback(trade);
      });
    });
  }

  async on(eventName: string, callback: (event: any) => Promise<void>) {
    if (!this.callbacks[eventName]) this.callbacks[eventName] = [] as any;
    this.callbacks[eventName].push(callback);
  }
}
