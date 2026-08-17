import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { DatabaseService } from 'src/database/database.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly db: DatabaseService,
  ) {}

  @Get('/is-admin')
  async isAdmin(@Query('address') address) {
    return this.authService.isAdmin(address);
  }

  @Post('/login')
  async login(@Body() login: LoginDto, @Req() req: Request) {
    // A real sign-in is a strong "this mirror is live" signal — record its origin.
    const origin = (req.headers?.origin as string) || '';
    if (origin) this.db.recordMirror(origin).catch(() => {});
    return this.authService.login(login);
  }
}
