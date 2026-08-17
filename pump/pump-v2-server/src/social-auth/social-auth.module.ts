import { Module } from '@nestjs/common';
import { SocialAuthController } from './social-auth.controller';
import { UsersService } from 'src/users/users.service';
import { DatabaseService } from 'src/database/database.service';
import { JwtStrategy } from './jwt-strategy.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [PassportModule],
  controllers: [SocialAuthController],
  providers: [UsersService, DatabaseService, JwtStrategy, JwtService],
  exports: [PassportModule],
})
export class SocialAuthModule {}
