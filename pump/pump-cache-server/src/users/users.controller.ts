import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/register')
  register(@Body('address') address: string, @Body('origin') origin: string) {
    return this.usersService.register(address, origin);
  }

  @Get('/:address')
  getUser(@Param('address') address: string) {
    return this.usersService.getUser(address);
  }
}
