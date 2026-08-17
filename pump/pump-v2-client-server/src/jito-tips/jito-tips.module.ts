import { Module } from '@nestjs/common';
import { JitoTipsService } from './jito-tips.service';
import { JitoTipsController } from './jito-tips.controller';
import { SolProviderService } from 'src/sol-provider/sol-provider.service';
import { SolProviderModule } from 'src/sol-provider/sol-provider.module';

@Module({
  imports: [SolProviderModule],
  providers: [JitoTipsService],
  controllers: [JitoTipsController],
})
export class JitoTipsModule {}
