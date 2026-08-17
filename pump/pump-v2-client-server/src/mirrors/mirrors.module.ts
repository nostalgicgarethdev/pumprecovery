import { Module } from '@nestjs/common';
import { MirrorsController } from './mirrors.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MirrorsController],
})
export class MirrorsModule {}
