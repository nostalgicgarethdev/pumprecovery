import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import { GetCohortAnalysisDto } from './dto/get-cohort-analysis.dto';
import { GetCoinsDto } from './dto/get-coins.dto';
import { GetTradesDto } from './dto/get-trades.dto';
import { GetTxTrackingDto } from './dto/get-tx-tracking.dto';
import { GetUniqueDailyUsersDto } from './dto/get-unique-daily-users.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('/trades')
  async getAllTrades(@Query() getTradesDto: GetTradesDto) {
    return this.metricsService.getAllTrades(getTradesDto);
  }

  @Get('/coins')
  async getAllCoins(@Query() getCoinsDto: GetCoinsDto) {
    return this.metricsService.getAllCoins(getCoinsDto);
  }

  @Get('/users')
  async getAllUsers(@Query() getUsersDto: GetUsersDto) {
    return this.metricsService.getAllUsers(getUsersDto);
  }

  @Get('/cohort-analysis')
  async getCohortAnalysis(@Query() getCohortAnalysisDto: GetCohortAnalysisDto) {
    return this.metricsService.getCohortAnalysis(getCohortAnalysisDto);
  }

  @Get('/cohort-analysis-view')
async getCohortAnalysisView(@Query() getCohortAnalysisDto: GetCohortAnalysisDto) {
  return this.metricsService.getCohortAnalysisView(getCohortAnalysisDto);
}



@Get('/tx-tracking')
async getTxTracking(@Query() getTxTrackingDto: GetTxTrackingDto) {
  return this.metricsService.getTxTracking(getTxTrackingDto);
}


  @Get('/sol-volume')
  async getSolVolume() {
    return this.metricsService.getSolVolume();
  }

  @Get('/buyer-count')
  async getBuyerCount() {
    return this.metricsService.getBuyerCountByMint();
  }

  @Get('/user-coins')
  async getUserCoins() {
    return this.metricsService.getCoinsBoughtByUser();
  }

  @Get('/tc-ratio')
  async getTradeCoinRatio() {
    return this.metricsService.getTradeCoinRatio();
  }

  @Get('/trade-count')
  async getTradeCount() {
    return this.metricsService.getTradeCount();
  }

  @Get('/creator-coin-count')
  async getCreatorCoinCount() {
    return this.metricsService.getCreatorCoinCount();
  }

  @Get('/trade-count-by-user')
  async getTradeCountByUser() {
    return this.metricsService.getTradeCountByUser();
  }

  @Get('/tvl')
  async getTotalTvl() {
    return this.metricsService.getTotalTvl();
  }

  @Get('/tvl-sol')
  async getTotalSolTvl() {
    return this.metricsService.getTotalSolTvl();
  }

  @Get('/dau')
  async getDau(@Query() getUniqueDailyUsersDto: GetUniqueDailyUsersDto) {
    return this.metricsService.getUniqueDailyUsers(getUniqueDailyUsersDto);
  }

  @Get('/dau-view')
  async getDauView(@Query() getUniqueDailyUsersDto: GetUniqueDailyUsersDto) {
    return this.metricsService.getUniqueDailyUsers(getUniqueDailyUsersDto);
  }

  @Get('/coins-launched')
  async getCoinsLaunched() {
    return this.metricsService.getUniqueDailyCoinsLaunched();
  }

  @Get('/avg-daily-sol-traded')
  async getAvgDailySolTraded() {
    return this.metricsService.getAvgDailySolTraded();
  }
}
