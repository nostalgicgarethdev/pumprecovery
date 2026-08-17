import { DatabaseService } from 'src/database/database.service';

import { BN } from '@coral-xyz/anchor';
import { Injectable } from '@nestjs/common';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

import { GetCohortAnalysisDto } from './dto/get-cohort-analysis.dto';
import { GetCoinsDto } from './dto/get-coins.dto';
import { GetTradesDto } from './dto/get-trades.dto';
import { GetTxTrackingDto } from './dto/get-tx-tracking.dto';
import { GetUniqueDailyUsersDto } from './dto/get-unique-daily-users.dto';
import { GetUsersDto } from './dto/get-users.dto';

@Injectable()
export class MetricsService {
  price = 0;

  constructor(private databaseService: DatabaseService) {
    this.updateSolPrice();

    setInterval(
      () => {
        this.updateSolPrice();
      },
      15 * 60 * 1000,
    );
  }
  async getTxTracking(geTxTrackingDto: GetTxTrackingDto) {
    const guduv = await this.databaseService.getTxTracking(geTxTrackingDto);

    return guduv;
  }

  async getAllTrades(getTradesDto: GetTradesDto) {
    const trades = await this.databaseService.getTrades(getTradesDto);

    return trades;
  }

  async getAllCoins(getCoinsDto: GetCoinsDto) {
    const coins = await this.databaseService.getCoins(getCoinsDto);

    return coins;
  }

  async getAllUsers(getUsersDto: GetUsersDto) {
    const users = await this.databaseService.getUsers(getUsersDto);

    return users;
  }

  async getCohortAnalysis(getCohortAnalysisDto: GetCohortAnalysisDto) {
    const ca = await this.databaseService.getCohortAnalysis(getCohortAnalysisDto);

    return ca;
  }

  async getCohortAnalysisView(getCohortAnalysisDto: GetCohortAnalysisDto) {
    const cav = await this.databaseService.getCohortAnalysisView(getCohortAnalysisDto);

    return cav;
  }

  async getSolVolume() {
    const sv = await this.databaseService.getTotalSolVolume();

    return sv;
  }

  async getBuyerCountByMint() {
    const bcbm = await this.databaseService.getBuyerCountByMint();

    return bcbm;
  }

  async getCoinsBoughtByUser() {
    const cbbu = await this.databaseService.getCoinsBoughtByUser();

    return cbbu;
  }

  async getTradeCoinRatio() {
    const gtcr = await this.databaseService.getTradeCoinRatio();

    return gtcr;
  }

  async getTradeCount() {
    const gtc = await this.databaseService.getTradeCount();

    return gtc;
  }

  async getCreatorCoinCount() {
    const gccc = await this.databaseService.getCreatorCoinCount();

    return gccc;
  }

  async getTradeCountByUser() {
    const gtcbu = await this.databaseService.getTradeCountByUser();

    return gtcbu;
  }

  async getUniqueDailyUsers(getUniqueDailyUsersDto: GetUniqueDailyUsersDto) {
    const gudu = await this.databaseService.getUniqueDailyUsers(getUniqueDailyUsersDto);

    return gudu;
  }

  async getUniqueDailyUsersView(getUniqueDailyUsersDto: GetUniqueDailyUsersDto) {
    const guduv = await this.databaseService.getUniqueDailyUsersView(getUniqueDailyUsersDto);

    return guduv;
  }

  async getUniqueDailyCoinsLaunched() {
    const gudcl = await this.databaseService.getCoinsLaunchedPerDay();

    return gudcl;
  }

  async getAvgDailySolTraded() {
    const gadst = await this.databaseService.getAvgSolTradedPerDay();

    return gadst;
  }

  async getTotalTvl() {
    const gtt = await this.databaseService.getTotalTvl();

    const transformedGtt = gtt.map((coin) => {
      const reservesInSmallestUnit = new BN(coin.reserves);
      const reservesSol = lamportsToSol(reservesInSmallestUnit);
      const reservesUSD = reservesSol * this.price;
      return {
        ...coin,
        reserves: reservesUSD.toFixed(2),
      };
    });

    return transformedGtt;
  }

  async getTotalSolTvl() {
    const gtt = await this.databaseService.getTotalTvl();

    const transformedGtt = gtt.map((coin) => {
      const reservesInSmallestUnit = new BN(coin.reserves);
      const reservesSol = lamportsToSol(reservesInSmallestUnit);
      return {
        ...coin,
        reserves: reservesSol.toFixed(2),
      };
    });

    return transformedGtt;
  }

  async updateSolPrice() {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    ).then((r) => r.json());

    this.price = res.solana.usd;
  }
}

export const lamportsToSol = (lamports: BN) => {
  return lamports.toNumber() / LAMPORTS_PER_SOL;
};
