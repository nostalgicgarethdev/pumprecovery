import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { DatabaseService } from 'src/database/database.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, DatabaseService, JwtService],
})
export class MessagesModule {}
