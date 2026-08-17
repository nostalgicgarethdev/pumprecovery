import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { DatabaseService } from 'src/database/database.service';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, DatabaseService],
  exports: [CommentsService],
})
export class CommentsModule {}
