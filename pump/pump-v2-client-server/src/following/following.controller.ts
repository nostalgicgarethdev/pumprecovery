import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FollowingService } from './following.service';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

@Controller('following')
export class FollowingController {
  constructor(private readonly followingService: FollowingService) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(AuthGuard('jwt'))
  @Post(':userId')
  async follow(@Param('userId') userId: string, @Req() req: any) {
    const { address } = req.user;
    return this.followingService.follow(userId, address);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(AuthGuard('jwt'))
  @Delete(':userId')
  async unfollow(@Param('userId') userId: string, @Req() req: any) {
    const { address } = req.user;
    return this.followingService.unfollow(userId, address);
  }

  @Get('/single/:id')
  async getFollow(@Param('id') id: string, @Query('userId') userId: string) {
    return this.followingService.getFollow(id, userId);
  }

  @Get('/followers/:id')
  async getFollowers(@Param('id') id: string) {
    return this.followingService.getFollowers(id);
  }

  @Get('/:userId')
  async getFollowing(@Param('userId') userId: string) {
    return this.followingService.getFollowing(userId);
  }
}
