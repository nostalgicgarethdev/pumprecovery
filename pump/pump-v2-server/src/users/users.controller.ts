import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Throttle } from '@nestjs/throttler';
import { User } from './entities/user.entity';
import { GetUsersDto } from './dto/get-users.dto';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post()
  create(@Body() user: User) {
    return this.usersService.create(user);
  }

  @Get()
  getAll(@Query() getUsersDto: GetUsersDto) {
    return this.usersService.getAll(getUsersDto);
  }

  @Get('/username')
  @UseGuards(AuthGuard('jwt'))
  async getUsername(@Req() request: Request) {
    const token = request.cookies['token'];
    const decodedToken = this.jwtService.decode(token);
    const user = await this.usersService.getOne(
      'twitter_username',
      decodedToken.username,
    );

    return { username: decodedToken.username, pfp: user.pfp };
  }

  @Post('/visit')
  @UseGuards(AuthGuard('jwt'))
  async visit(@Req() request: Request) {
    const token = request.cookies['token'];
    const decodedToken = this.jwtService.decode(token);

    return await this.usersService.visit(decodedToken.username);
  }
}
