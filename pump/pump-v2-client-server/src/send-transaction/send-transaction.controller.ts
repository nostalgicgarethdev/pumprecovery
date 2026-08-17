import { Body, Controller, Get, Post } from '@nestjs/common';
import { SendTransactionService } from './send-transaction.service';

@Controller('send-transaction')
export class SendTransactionController {
  constructor(
    private readonly sendTransactionService: SendTransactionService,
  ) {}

  @Post()
  async sendTransaction(
    @Body('serializedTransaction') serializedTransaction: any,
    @Body('retries') retries: number,
  ) {
    retries = Math.min(Number(retries || 1), 5);
    return this.sendTransactionService.sendTransaction(
      serializedTransaction,
      retries,
    );
  }
}
