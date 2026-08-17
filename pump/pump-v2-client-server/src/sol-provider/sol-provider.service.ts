import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from '@solana/web3.js';

@Injectable()
export class SolProviderService {
  connection: Connection;
  dedicatedConnection: Connection;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('solanaRpcUrl') || 'https://api.mainnet-beta.solana.com';
    const dedicatedUrl = this.configService.get<string>('dedicatedSolanaRpcUrl') || rpcUrl;

    if (!this.configService.get('solanaRpcUrl')) {
      console.warn('SOLANA_RPC_URL not set, using public fallback');
    }
    if (!this.configService.get('dedicatedSolanaRpcUrl')) {
      console.warn('DEDICATED_SOLANA_RPC_URL not set, falling back to main RPC');
    }

    this.connection = new Connection(rpcUrl);
    this.dedicatedConnection = new Connection(dedicatedUrl);
  }
}
