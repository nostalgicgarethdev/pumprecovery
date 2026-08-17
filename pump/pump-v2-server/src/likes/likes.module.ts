import { Module } from '@nestjs/common';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';

@Module({
  providers: [LikesService, JwtService, DatabaseService],
  controllers: [LikesController],
})
export class LikesModule {}
