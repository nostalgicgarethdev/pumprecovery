import { Module } from '@nestjs/common';
import { EventListenerService } from './event-listener.service';

@Module({
  providers: [EventListenerService],
  exports: [EventListenerService],
})
export class EventListenerModule {}
