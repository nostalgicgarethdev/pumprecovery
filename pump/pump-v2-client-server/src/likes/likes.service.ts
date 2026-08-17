import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { RepliesService } from 'src/replies/replies.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class LikesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly repliesService: RepliesService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createLike(target_id: string, address: string) {
    const error = await this.databaseService.createLike({
      target_id,
      user: address,
    });
    if (error) return;

    const reply = await this.repliesService.getReply(Number(target_id));
    await this.repliesService.updateReply({
      ...reply,
      total_likes: reply.total_likes + 1,
    });

    const user = await this.databaseService.getRawUser(reply.user);
    await this.usersService.upsertUser({
      address: reply.user,
      likes_received: user ? user.likes_received + 1 : 1,
    });

    await this.notificationsService.createNotification(
      reply.user,
      'like',
      reply.id,
      address,
      `${address.slice(0, 6)} liked your comment`,
    );
  }

  async deleteLike(target_id: string, address: string) {
    await this.databaseService.deleteLike({ target_id, user: address });

    const reply = await this.repliesService.getReply(Number(target_id));
    await this.repliesService.updateReply({
      ...reply,
      total_likes: Math.max(reply.total_likes - 1, 0),
    });

    const user = await this.databaseService.getRawUser(reply.user);
    await this.usersService.upsertUser({
      ...user,
      likes_received: Math.max(user ? user.likes_received - 1 : 0, 0),
    });

    await this.notificationsService.deleteNotification(
      'like',
      target_id,
      address,
    );
  }

  async getLikes(target_id: string) {
    return this.databaseService.getLikes(target_id);
  }
}
