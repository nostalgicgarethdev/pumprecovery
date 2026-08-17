import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { DatabaseService } from 'src/database/database.service';
import pumpIdl from '../../idl/pump.json';
import { TradeEvent } from 'src/candlesticks/events/trade-created.event';
import { Trade } from './entities/trade.entity';
import { CoinsService } from 'src/coins/coins.service';
import { Coin } from 'src/coins/entities/coin.entity';
import { BN } from '@coral-xyz/anchor';
import { TradesGateway } from './trades.gateway';
import { SolPriceService } from 'src/sol-price/sol-price.service';

@Injectable()
export class TradesService {
  constructor(
    private databaseService: DatabaseService,
    private coinsService: CoinsService,
    private tradesGateway: TradesGateway,
    private solPriceService: SolPriceService,
  ) {}

  async handleTradeCreatedEvent(trade: TradeEvent, signature: string) {
    if (trade.solAmount.lt(new BN(1000))) return; // lowered to match candlesticks for small trades (was 5M lamports)

    console.log(
      `Creating trade: ${
        (trade.mint, trade.timestamp)
      } at ${new Date().toISOString()}`,
      signature,
    );

    const databaseTrade: Trade = {
      signature,
      sol_amount: trade.solAmount.toNumber(),
      token_amount: trade.tokenAmount.toNumber(),
      is_buy: trade.isBuy,
      user: trade.user.toBase58(),
      timestamp: trade.timestamp.toNumber(),
      mint: trade.mint.toBase58(),
      virtual_sol_reserves: trade.virtualSolReserves?.toNumber(),
      virtual_token_reserves: trade.virtualTokenReserves?.toNumber(),
    };

    await this.databaseService.createTrade(databaseTrade);

    const rawCoin = await this.databaseService.getCoinRaw(
      trade.mint.toBase58(),
    );

    if (rawCoin) {
      try {
        rawCoin.virtual_sol_reserves = trade.virtualSolReserves.toString();
        rawCoin.virtual_token_reserves = trade.virtualTokenReserves.toString();

        await this.databaseService.updateCoin(rawCoin);
      } catch (e) {
        console.log(`Could not update coin: ${rawCoin.mint}. Error: ${e}`);
      }
    } else {
      console.error(
        `No coin or bonding curve found for mint: ${trade.mint.toBase58()}`,
      );

      return;
    }

    const coin = await this.coinsService.getCoinByMint(trade.mint.toBase58());
    const user = await this.databaseService.getUser2(trade.user.toBase58());

    const tradeWithDetails = {
      ...databaseTrade,
      ...coin,
      username: user?.username,
      profile_image: user?.profile_image,
    };

    const fetchedSolPrice = this.solPriceService.getPrice();
    const usdMarketCap = coin.market_cap * fetchedSolPrice.solPrice;
    tradeWithDetails.usd_market_cap = usdMarketCap;

    this.tradesGateway.emitTradeCreatedEvent(tradeWithDetails);
  }
}
