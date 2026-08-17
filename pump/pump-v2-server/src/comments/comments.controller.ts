import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get('/:mintId')
  getComments(@Param('mintId') mintId: string) {
    return this.commentsService.getComments(mintId);
  }

  @Post()
  createComment(@Body() comment: CreateCommentDto) {
    return this.commentsService.createComment(comment);
  }
}
