import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersService: UsersService,
  ) {}

  async createNotification(
    user: string,
    type: 'mention' | 'like',
    target_id: string,
    source_user: string,
    message: string,
  ) {
    await this.databaseService.createNotification({
      user,
      type,
      target_id,
      source_user,
      message,
    });
  }

  async deleteNotification(
    type: 'mention' | 'like',
    target_id: string,
    source_user: string,
  ) {
    await this.databaseService.deleteNotification(type, target_id, source_user);
  }

  async getNotifications(address: string, limit: number, offset: number) {
    return this.databaseService.getNotifications(address, limit, offset);
  }

  async markNotificationsAsRead(address: string) {
    this.databaseService.markNotificationsAsRead(address);
  }
}
