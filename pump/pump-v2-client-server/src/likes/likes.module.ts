import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { DatabaseService } from 'src/database/database.service';
import { RepliesModule } from 'src/replies/replies.module';
import { UsersModule } from 'src/users/users.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [RepliesModule, UsersModule, NotificationsModule, DatabaseModule],
  providers: [LikesService],
  controllers: [LikesController],
})
export class LikesModule {}
