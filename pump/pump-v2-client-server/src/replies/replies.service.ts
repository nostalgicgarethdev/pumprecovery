import { Injectable } from '@nestjs/common';
import { ReplyDto } from './dto/reply.dto';
import { DatabaseService } from 'src/database/database.service';
import { AuthService } from 'src/auth/auth.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class RepliesService {
  banTerms = [];

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {
    this.updateBanTerms();

    setInterval(() => {
      this.updateBanTerms();
    }, 60_000);
  }

  async updateBanTerms() {
    this.banTerms = await this.databaseService.getBanTerms();
  }

  async banTerm(term: string, address: string) {
    const isAdmin = await this.authService.isAdmin(address);
    if (!isAdmin) throw new Error('Not admin');

    await this.databaseService.createBanTerm(term);
    await this.updateBanTerms();
  }

  async getBanTerms(address: string) {
    const isAdmin = await this.authService.isAdmin(address);
    if (!isAdmin) throw new Error('Not admin');

    return this.databaseService.getBanTerms();
  }

  async deleteBanTerm(id: string, address: string) {
    const isAdmin = await this.authService.isAdmin(address);
    if (!isAdmin) throw new Error('Not admin');

    await this.databaseService.deleteBanTerm(id);
    await this.updateBanTerms();
  }

  async createReply(reply: ReplyDto, address: string, origin: string) {
    if (await this.isBanned(origin)) throw new Error('User is banned');

    const { mint, fileUri, text } = reply;

    const pattern = /https:\/\/(www\.)?pump\.fun\//;
    const badTerms = this.banTerms.map((v) => v.term);

    if (
      pattern.test(text) ||
      badTerms.some((v) => text.toLowerCase().includes(v.toLowerCase()))
    ) {
      throw new Error('Invalid text');
    }

    if (text.length > 2000) {
      throw new Error('Text is too long');
    }

    const insertedReply = await this.databaseService.createReply({
      mint,
      file_uri: fileUri,
      text,
      user: address,
      origin,
    });

    const mentions = this.extractMentions(reply.text);
    mentions.map(async (replyId) => {
      const mentionedReply = await this.databaseService.getReply(replyId);
      if (!mentionedReply) return;

      this.notificationsService.createNotification(
        mentionedReply.user,
        'mention',
        insertedReply.id,
        address,
        `${address.slice(0, 6)} mentioned you in a comment`,
      );

      const user = await this.databaseService.getRawUser(mentionedReply.user);
      await this.usersService.upsertUser({
        ...user,
        mentions_received: user ? user.mentions_received + 1 : 1,
      });
    });

    return insertedReply;
  }

  async updateReply(reply: any) {
    await this.databaseService.updateReply(reply);
  }

  async getReplies(mint: string, user: string) {
    return this.databaseService.getReplies(mint, user);
  }

  async getReply(id: number) {
    return this.databaseService.getReply(id);
  }

  async getAllReplies(limit: number, offset: number) {
    return this.databaseService.getAllReplies(limit, offset);
  }

  async markAsHidden(id: number, hidden: boolean, address: string) {
    // check that the address is in the admin table
    const isAdmin = await this.authService.isAdmin(address);
    if (!isAdmin) throw new Error('Not admin');

    const reply = await this.databaseService.getReply(id);
    await this.databaseService.updateReply({ ...reply, hidden });

    const mentions = this.extractMentions(reply.text);
    mentions.map(async (replyId) => {
      const mentionedReply = await this.databaseService.getReply(replyId);

      await this.notificationsService.deleteNotification(
        'mention',
        reply.id,
        reply.user,
      );

      const user = await this.databaseService.getRawUser(mentionedReply.user);
      await this.usersService.upsertUser({
        ...user,
        mentions_received: Math.max(user ? user.mentions_received - 1 : 0, 0),
      });
    });
  }

  async ban(id: number, expires: number, address: string) {
    // check that the address is in the admin table
    const isAdmin = await this.authService.isAdmin(address);
    if (!isAdmin) throw new Error('Not admin');

    const reply = await this.databaseService.getReply(id);
    await this.databaseService.upsertBan({ origin: reply.origin, expires });

    const recentReplies = await this.getUserReplies(reply.user, 10, 0, true);
    await Promise.all(
      recentReplies.map(async (reply) => {
        await this.markAsHidden(reply.id, expires > 0, address);
      }),
    );
  }

  async isBanned(origin: string) {
    const ban = await this.databaseService.getBan(origin);
    return ban && ban.expires > Date.now();
  }

  async getBan(origin: string) {
    return this.databaseService.getBan(origin);
  }

  async isOriginOfReplyBanned(id: number, address: string) {
    const isAdmin = await this.authService.isAdmin(address);
    if (!isAdmin) throw new Error('Not admin');

    const reply = await this.getReply(Number(id));
    return this.isBanned(reply.origin);
  }

  async getUserReplies(
    address: string,
    limit: number,
    offset: number,
    includeHidden: boolean = false,
  ) {
    return this.databaseService.getUserReplies(
      address,
      limit,
      offset,
      includeHidden,
    );
  }

  private extractMentions(message: string): number[] {
    const mentionPattern = /#(\d+)/g;
    const matches = message.match(mentionPattern);

    if (!matches) {
      return [];
    }

    const mentionIds = [
      ...new Set(matches.map((match) => parseInt(match.slice(1)))),
    ].slice(0, 5);

    return mentionIds;
  }
}
