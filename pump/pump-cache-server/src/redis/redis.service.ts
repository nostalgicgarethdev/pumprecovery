import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType, createClient } from 'redis';

@Injectable()
export class RedisService {
  client: RedisClientType<any>;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get('redisUrl'),
    });

    this.client.on('error', (err) => console.log('Redis Client Error', err));
    this.client.connect();
  }
}
