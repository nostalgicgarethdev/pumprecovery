import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io-client';

@WebSocketGateway({
  cors: {
    origin: [
      'https://stacc.art',
      'https://www.stacc.art',
      'https://pump.fun',
      'https://www.pump.fun',
      'http://localhost:3000',
    ],
  },
  transports: ['websocket'],
})
export class TradesGateway {
  @WebSocketServer() server: Server;
  private connectionTime: Map<string, number> = new Map();

  afterInit() {
    setInterval(() => {
      const now = Date.now();

      console.log(
        `Total websocket connections: ${this.server.engine.clientsCount}`,
      );

      this.server.sockets.sockets.forEach((socket) => {
        const connectedTime = this.connectionTime.get(socket.id) || now;

        // Close if connection open for more than 60 minutes
        if (now - connectedTime > 60 * 60_000) {
          socket.disconnect(true);
          console.log(
            `Socket ${socket.id} disconnected after being open for more than 60 minutes.`,
          );
        }
      });
    }, 3_000);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.connectionTime.set(client.id, Date.now());
  }

  handleDisconnect(client: Socket) {
    this.connectionTime.delete(client.id);
  }
}
