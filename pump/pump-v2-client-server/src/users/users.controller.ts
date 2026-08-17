import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

interface Profile {
  calls: number;
  totalCallDuration: number;
}

@Controller('users')
export class UsersController {
  profileCache: Record<string, Profile> = {};

  constructor(private readonly usersService: UsersService) {
    setInterval(() => {
      console.log('users controller cache', this.profileCache);
    }, 3_000);
  }

  async startProfile(name: string): Promise<number> {
    if (!this.profileCache[name]) {
      this.profileCache[name] = { calls: 0, totalCallDuration: 0 };
    }

    return Date.now();
  }

  async endProfile(name: string, duration: number) {
    this.profileCache[name].calls += 1;
    this.profileCache[name].totalCallDuration += duration;
  }

  @Throttle({ default: { limit: 60_00, ttl: 10 } })
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const startTime = await this.startProfile('getUser');
    const res = await this.usersService.getUser(id);

    await this.endProfile('getUser', Date.now() - startTime);
    return res;
  }

  @Throttle({ default: { ttl: 120_000, limit: 10 } })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async updateUser(
    @Body('username') username: string,
    @Body('profileImage') profileImage: string,
    @Req() req: any,
  ) {
    const startTime = await this.startProfile('updateUser');
    const { address } = req.user;
    const res = await this.usersService.updateUserProfile({
      address,
      username,
      profile_image: profileImage,
    });

    await this.endProfile('updateUser', Date.now() - startTime);
    return res;
  }
}
