import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class LikesService {
  constructor(private databaseService: DatabaseService) {}

  async like(targetId: string, username: string) {
    await this.databaseService.createLike(targetId, username);
  }

  async getLikes(targetId: string) {
    return this.databaseService.getLikes(targetId);
  }

  async unlike(targetId: string, username: string) {
    await this.databaseService.deleteLike(targetId, username);
  }
}
