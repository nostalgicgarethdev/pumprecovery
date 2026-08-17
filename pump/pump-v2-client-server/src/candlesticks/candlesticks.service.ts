import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class CandlesticksService {
  constructor(private databaseService: DatabaseService) {}

  async getAll(mint: string, interval?: number) {
    return this.databaseService.getCandlesticks(mint, interval);
  }
}
