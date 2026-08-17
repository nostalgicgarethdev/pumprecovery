import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class UsersService {
  constructor(private readonly redisService: RedisService) {}

  async register(address: string, origin: string) {
    await this.redisService.client.set(
      `user:${address}`,
      JSON.stringify({ origin }),
    );
  }

  async getUser(address: string) {
    return this.redisService.client.get(`user:${address}`);
  }
}
