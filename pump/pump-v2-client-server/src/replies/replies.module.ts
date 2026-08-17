import { Module } from '@nestjs/common';
import { RepliesService } from './replies.service';
import { RepliesController } from './replies.controller';
import { DatabaseService } from 'src/database/database.service';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { UsersModule } from 'src/users/users.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [AuthModule, NotificationsModule, UsersModule, DatabaseModule],
  providers: [RepliesService],
  controllers: [RepliesController],
  exports: [RepliesService],
})
export class RepliesModule {}
