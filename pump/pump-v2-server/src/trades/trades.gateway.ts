import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: [
      'https://stacc.art',
      'https://www.stacc.art',
      'https://pump.fun',
      'https://www.pump.fun',
      process.env.FRONTEND_DOMAIN,
      'http://localhost:3000',
    ],
    credentials: true,
  },
})
export class TradesGateway {
  @WebSocketServer()
  server: Server;

  emitTradeCreatedEvent(data: any) {
    console.log('trade data', data);
    this.server.emit('tradeCreated', data);
  }

  handleConnection(client: Socket) {
    // console.log(`Client connected: ${client.id}`);
    // // Additional logging for debugging purposes
    // // For example, you might want to log the number of connected clients
    // console.log(`Total connected clients: ${this.server.engine.clientsCount}`);
  }

  // handleDisconnect(client: Socket) {
  //   console.log('client disconnected', client.id);
  // }
}
