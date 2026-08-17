import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

@Controller('likes')
export class LikesController {
  constructor(
    private likesService: LikesService,
    private jwtService: JwtService,
  ) {}

  @Get('/:targetId')
  getLikes(@Param('targetId') targetId: string) {
    return this.likesService.getLikes(targetId);
  }

  @Post('/:targetId')
  @UseGuards(AuthGuard('jwt'))
  createLike(@Req() request: Request, @Param('targetId') targetId: string) {
    const token = request.cookies['token'];
    const { username } = this.jwtService.decode(token);
    return this.likesService.like(targetId, username);
  }

  @Delete('/:targetId')
  @UseGuards(AuthGuard('jwt'))
  deleteLike(@Req() request: Request, @Param('targetId') targetId: string) {
    const token = request.cookies['token'];
    const { username } = this.jwtService.decode(token);
    return this.likesService.unlike(targetId, username);
  }
}
