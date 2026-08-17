import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

const MIN_USERNAME_UPDATE_DURATION = 1 * 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getUser(id: string) {
    const isAddress = id.length > 20;

    const user = await (isAddress
      ? this.databaseService.getUser(id)
      : this.databaseService.getUserByUsername(id));

    return user;
  }

  async upsertUser(user: any) {
    await this.databaseService.upsertUser(user);
  }

  async updateUserProfile(newUser: any) {
    const { address } = newUser;
    const user = await this.databaseService.getUser(address);
    const existingUser = await this.databaseService.getUserByUsername(
      newUser.username,
    );

    if (user && user.username !== newUser.username) {
      if (
        user.last_username_update_timestamp + MIN_USERNAME_UPDATE_DURATION >
        Date.now()
      ) {
        return {
          error: `You can update your username on ${new Date(
            user.last_username_update_timestamp + MIN_USERNAME_UPDATE_DURATION,
          ).toISOString()}`,
        };
      }

      newUser.last_username_update_timestamp = Date.now();
      newUser.username = newUser.username.toLowerCase();
    }

    if (newUser.username && existingUser && existingUser.address !== address) {
      return { error: 'Username already taken' };
    }

    if (newUser.username?.length > 10) {
      return { error: 'Username must be 10 characters or less' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUser.username)) {
      return {
        error: 'Username must only contain letters, numbers, or underscores',
      };
    }

    const userResult = await this.databaseService.upsertUser(newUser);
    if (userResult) {
      return userResult;
    }

    return { error: 'Could not update user' };
  }
}
