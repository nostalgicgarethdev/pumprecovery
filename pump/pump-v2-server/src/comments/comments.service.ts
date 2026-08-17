import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { DatabaseService } from 'src/database/database.service';
import { TradeEvent } from 'src/candlesticks/events/trade-created.event';
import { lamportsToSol } from 'utils/lamportsToSol';
import { BN } from '@coral-xyz/anchor';

@Injectable()
export class CommentsService {
  constructor(private databaseService: DatabaseService) {}

  async getComment(targetId: string) {
    const comment = await this.databaseService.getComment(targetId);
    return comment;
  }

  async getComments(mintId: string) {
    const comments = await this.databaseService.getComments(mintId);
    return comments;
  }

  async handleUpdateComment(event: TradeEvent, signature: string) {
    if (event.solAmount.lt(new BN(1000))) return; // lowered to allow small trades to update comments/activity (was 5M)

    const comment = await this.databaseService.getComment(signature);

    if (!comment) return;

    comment.is_confirmed = true;
    comment.mint_id = event.mint.toBase58();
    comment.user = event.user.toBase58();
    comment.is_buy = event.isBuy;
    comment.sol_amount = lamportsToSol(event.solAmount);

    await this.databaseService.updateComment(comment);
  }

  async createComment(createCommentDto: CreateCommentDto) {
    console.log('comment', createCommentDto);

    const comment = {
      signature: createCommentDto.signature,
      is_confirmed: false,
      content: createCommentDto.comment,
      timestamp: Date.now(),
    };

    // write the comment to the db
    await this.databaseService.createComment(comment);
  }
}
