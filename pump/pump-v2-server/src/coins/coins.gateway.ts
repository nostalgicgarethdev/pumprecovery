import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'http';

@WebSocketGateway({
  namespace: '/coins',
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
export class CoinsGateway {
  @WebSocketServer()
  server: Server;

  emitNewKingOfTheHill(data: any) {
    console.log('new king of the hill', data);
    this.server.emit('NewKingOfTheHill', data);
  }
}
