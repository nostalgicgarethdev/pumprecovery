import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GlobalParamsService {
  globalParamsCache: Record<string, any>;

  constructor(private readonly databaseService: DatabaseService) {
    setInterval(async () => {
      const globalParams = await this.databaseService.getGlobalParams();
      if (globalParams) this.globalParamsCache = globalParams;
    }, 5_000);
  }

  async getGlobalParamsByMint(mint: string) {
    const coin = await this.databaseService.getCoinByMint(mint);
    if (!coin) return;

    let params: any;
    if (this.globalParamsCache) {
      params = this.globalParamsCache.find(
        (v) => v.timestamp <= coin.created_timestamp,
      );
    } else {
      params = await this.databaseService.getGlobalParamsAtTimestamp(
        coin.created_timestamp,
      );
    }

    return params;
  }
}
