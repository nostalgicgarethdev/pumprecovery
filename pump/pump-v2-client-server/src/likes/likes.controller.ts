import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { LikesService } from './likes.service';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseGuards(AuthGuard('jwt'))
  @Post(':targetId')
  async createLike(@Param('targetId') targetId: string, @Req() req: any) {
    const { address } = req.user;
    return this.likesService.createLike(targetId, address);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':targetId')
  async deleteLike(@Param('targetId') targetId: string, @Req() req: any) {
    const { address } = req.user;
    return this.likesService.deleteLike(targetId, address);
  }

  @Get(':targetId')
  async getLikes(@Param('targetId') targetId: string) {
    return this.likesService.getLikes(targetId);
  }
}
