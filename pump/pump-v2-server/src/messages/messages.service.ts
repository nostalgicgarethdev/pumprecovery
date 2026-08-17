import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { VerifyMessageDto } from './dto/verify-message.dto';
import * as bs58 from 'bs58';
import { sign } from 'tweetnacl';

@Injectable()
export class MessagesService {
  constructor(private databaseService: DatabaseService) {}

  async verifyMessage(verifyMessageDto: VerifyMessageDto) {
    const msg = await this.databaseService.getMessage(
      'id',
      verifyMessageDto.message_id,
    );

    const verified = sign.detached.verify(
      new TextEncoder().encode(msg.msg),
      bs58.decode(verifyMessageDto.signature),
      bs58.decode(verifyMessageDto.address),
    );

    if (verified) {
      msg.twitter_username = verifyMessageDto.twitter_username;
      msg.verified = true;
      msg.address = verifyMessageDto.address;
      this.databaseService.updateMessage(msg);
      return { success: true, message: 'Message verified successfully.' };
    } else {
      return {
        success: false,
        message: 'Verification failed. Invalid signature or public key.',
      };
    }
  }

  async isUserVerified(username: string, address: string) {
    try {
      const message = await this.databaseService.getMessageByUserAndAddress(
        username,
        address,
      );
      return message ? message.verified : false;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async generateNewMessage(username: string) {
    const msg = await this.databaseService.generateUniqueMessage(username);

    return msg;
  }

  // unlink an account if the user has not signed a message in the last 48 hours
  async unlink(username: string) {
    const latestVerifiedMessage =
      await this.databaseService.getLatestVerifiedMessageForUser(username);

    const minDuration = 1000 * 60 * 60 * 48;
    const timeLeft = Date.now() - latestVerifiedMessage.timestamp - minDuration;

    if (
      !latestVerifiedMessage.timestamp ||
      latestVerifiedMessage.timestamp <= Date.now() - minDuration
    ) {
      await this.databaseService.clearMessagesForUser(username);

      return { success: true };
    }

    const hoursLeft = Math.abs(timeLeft) / (1000 * 60 * 60);
    return {
      success: false,
      message: `You must wait ${hoursLeft.toFixed(2)} hours before unlinking.`,
    };
  }
}
