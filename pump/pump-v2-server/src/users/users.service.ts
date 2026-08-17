import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { User } from './entities/user.entity';
import { GetUsersDto } from './dto/get-users.dto';

@Injectable()
export class UsersService {
  private lastVisited: Record<string, number> = {};

  constructor(private databaseService: DatabaseService) {}

  onModuleInit() {
    setInterval(() => this.cleanupLastVisited(), 60 * 60 * 1000);
  }

  private cleanupLastVisited() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    Object.keys(this.lastVisited).forEach((username) => {
      if (this.lastVisited[username] < oneHourAgo) {
        delete this.lastVisited[username];
      }
    });
  }

  async create(user: User) {
    console.log('CREATING');

    const doesUserExist = await this.databaseService.getUser(
      'twitter_username',
      user.twitter_username,
    );

    if (doesUserExist) {
      console.log('user already exists');
      return null;
    } else {
      await this.databaseService.createUser(user);
    }

    return user;
  }

  async getOne(uniqueKey: string, value: string) {
    const user = await this.databaseService.getUser(uniqueKey, value);

    return user;
  }

  async getAll(filters: GetUsersDto) {
    const users = await this.databaseService.getUsers(filters);

    return users;
  }

  async updateUser(user: User) {
    await this.databaseService.updateUser(user);

    return user;
  }

  async visit(username: string) {
    const currentTime = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (
      this.lastVisited[username] &&
      currentTime - this.lastVisited[username] < oneHour
    ) {
      console.log('Visit within an hour, skipping upsert');
      return username;
    }

    this.lastVisited[username] = currentTime;
    await this.databaseService.upsertUserVisited(username);

    return username;
  }
}
