import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Throttle } from '@nestjs/throttler';
import { VerifyMessageDto } from './dto/verify-message.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

@Controller('messages')
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private jwtService: JwtService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async verify(
    @Req() request: Request,
    @Body() verifyMessageDto: VerifyMessageDto,
  ) {
    const token = request.cookies['token'];
    const decodedToken = this.jwtService.decode(token);

    if (decodedToken.username !== verifyMessageDto.twitter_username) {
      throw new UnauthorizedException(
        'Failed to sign. Username does not match authentication.',
      );
    }

    const alreadySigned = await this.messagesService.isUserVerified(
      decodedToken.username,
      verifyMessageDto.address,
    );

    if (!alreadySigned) {
      return this.messagesService.verifyMessage(verifyMessageDto);
    } else {
      return { message: 'User has already signed in with this address.' };
    }
  }

  @Get('user/:address')
  @UseGuards(AuthGuard('jwt'))
  async isUserVerified(
    @Req() request: Request,
    @Param('address') address: string,
  ) {
    const token = request.cookies['token'];
    const decodedToken = this.jwtService.decode(token);

    return {
      isVerified: await this.messagesService.isUserVerified(
        decodedToken.username,
        address,
      ),
    };
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  generate(@Req() request: Request) {
    const token = request.cookies['token'];
    const { username } = this.jwtService.decode(token);
    return this.messagesService.generateNewMessage(username);
  }

  @Get('unlink')
  @UseGuards(AuthGuard('jwt'))
  async unlink(@Req() request: Request, @Res() response: Response) {
    const token = request.cookies['token'];
    const { username } = this.jwtService.decode(token);
    const result = await this.messagesService.unlink(username);

    if (result.success) {
      response
        .cookie('token', '', {
          httpOnly: true,
          expires: new Date(0), // Set the expiration to a past date
        })
        .json(result);
    } else {
      response.json(result);
    }
  }
}
