import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { CoinsModule } from 'src/coins/coins.module';
import { EventListenerModule } from 'src/event-listener/event-listener.module';

@Module({
  imports: [CoinsModule, EventListenerModule],
  providers: [OrchestratorService],
})
export class OrchestratorModule {}
