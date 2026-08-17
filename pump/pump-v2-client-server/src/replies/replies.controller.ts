import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RepliesService } from './replies.service';
import { AuthGuard } from '@nestjs/passport';
import { ReplyDto } from './dto/reply.dto';
import { Throttle } from '@nestjs/throttler';
import { getClientIp } from 'src/utils/getClientIp';

@Controller('replies')
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createReply(@Body() reply: ReplyDto, @Req() req: any) {
    const { address } = req.user;
    const origin = getClientIp(req);
    return this.repliesService.createReply(reply, address, origin);
  }

  @Post('ban-terms')
  @UseGuards(AuthGuard('jwt'))
  async banTerm(@Body('term') term: string, @Req() req: any) {
    const { address } = req.user;
    return this.repliesService.banTerm(term, address);
  }

  @Get('ban-terms')
  @UseGuards(AuthGuard('jwt'))
  async getBanTerms(@Req() req: any) {
    const { address } = req.user;
    return this.repliesService.getBanTerms(address);
  }

  @Delete('ban-terms/:id')
  @UseGuards(AuthGuard('jwt'))
  async removeBanTerm(@Param('id') id: string, @Req() req: any) {
    const { address } = req.user;
    return this.repliesService.deleteBanTerm(id, address);
  }

  @Get('ban')
  async getBan(@Req() req: any) {
    const origin = getClientIp(req);
    const ban = await this.repliesService.getBan(origin);
    // No ban for this origin (the common case) — getBan returns null/undefined,
    // so guard before deleting the field (this `delete` on null was the 500).
    if (!ban) return null;
    delete ban.origin;
    return ban;
  }

  @Get(':mint')
  // public read, raise limit vs global throttler to avoid 429s on coin pages
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async getReplies(@Param('mint') mint: string, @Query('user') user?: string) {
    user = user || null;
    const replies = await this.repliesService.getReplies(mint, user);
    return replies;
  }

  @Get('/user-replies/:address')
  async getUserReplies(
    @Param('address') address: string,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    const replies = await this.repliesService.getUserReplies(
      address,
      Number(limit),
      Number(offset),
    );

    return replies.map((v) => {
      delete v.origin; // delete the ip addresses from the response
      return v;
    });
  }

  @Get()
  async getAllReplies(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    return this.repliesService.getAllReplies(limit, offset);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('mark-as-hidden/:id')
  markAsNsfw(
    @Param('id') id: number,
    @Body('hidden') hidden: boolean,
    @Req() req: any,
  ) {
    const { address } = req.user;
    return this.repliesService.markAsHidden(id, hidden, address);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('ban/:id')
  ban(
    @Param('id') id: number,
    @Body('expires') expires: number,
    @Req() req: any,
  ) {
    const { address } = req.user;
    return this.repliesService.ban(id, expires, address);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('is-origin-of-reply-banned/:id')
  async isOriginOfReplyBanned(@Param('id') id: number, @Req() req: any) {
    const { address } = req.user;
    return this.repliesService.isOriginOfReplyBanned(id, address);
  }
}
