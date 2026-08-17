import { GetCohortAnalysisDto } from 'src/metrics/dto/get-cohort-analysis.dto';
import { GetCoinsDto } from 'src/metrics/dto/get-coins.dto';
import { GetTradesDto } from 'src/metrics/dto/get-trades.dto';
import { GetTxTrackingDto } from 'src/metrics/dto/get-tx-tracking.dto';
import {
  GetUniqueDailyUsersDto,
} from 'src/metrics/dto/get-unique-daily-users.dto';
import { GetUsersDto } from 'src/metrics/dto/get-users.dto';

import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Cron,
  CronExpression,
} from '@nestjs/schedule';
import {
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = this.getSupabase();
  }

  getSupabase(): SupabaseClient {
    return createClient(
      this.configService.get('supabaseUrl'),
      this.configService.get('supabaseKey'),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'UTC',
  })
  async handleCron() {
    this.logger.debug(
      'Running scheduled task to fetch and store total virtual SOL reserves',
    );
    try {
      const { data, error } = await this.supabase.rpc(
        'get_total_virtual_sol_reserves',
      );
      if (error) {
        throw error;
      }

      const result = await this.supabase
        .from('tvl')
        .insert([{ timestamp: Date.now(), reserves: data }]);

      if (result.error) {
        throw result.error;
      }

      this.logger.debug('Successfully stored total virtual SOL reserves');
    } catch (error) {
      this.logger.error(
        'Failed to fetch or store total virtual SOL reserves',
        error,
      );
    }
  }

  async getTrades({ limit = 10, offset = 0 }: GetTradesDto) {
    let query = this.supabase.from('trades').select('*');

    query.range(Number(offset), Number(offset) + Number(limit) - 1);

    try {
      const { data: trades, error } = await query;

      if (error) {
        throw error;
      }

      return trades;
    } catch (e) {
      console.error('Error fetching trades:', e);
      return null;
    }
  }

  async getCoins({ limit = 10, offset = 0 }: GetCoinsDto) {
    let query = this.supabase.from('coins').select('*');

    query.range(Number(offset), Number(offset) + Number(limit) - 1);

    try {
      const { data: coins, error } = await query;

      if (error) {
        throw error;
      }

      return coins;
    } catch (e) {
      console.error('Error fetching coins:', e);
      return null;
    }
  }

  async getUsers({ limit = 10, offset = 0 }: GetUsersDto) {
    let query = this.supabase.from('users').select('*');

    query.range(Number(offset), Number(offset) + Number(limit) - 1);

    try {
      const { data: users, error } = await query;

      if (error) {
        throw error;
      }

      return users;
    } catch (e) {
      console.error('Error fetching users:', e);
      return null;
    }
  }

async getCohortAnalysis(getCohortAnalysisDto: GetCohortAnalysisDto) {
  const { limit, offset } = getCohortAnalysisDto;

  try {
    const { data, error } = await this.supabase
      .rpc('get_cohort_analysis', {
        p_limit: limit || 30, //START: from cohort X-1 days ago ; currently set to 29 days ago
        p_offset: offset || 0, //END: 0 = Today cohort, 1 = Yesterday cohort, etc.
      });

    if (error) {
      console.error('Error fetching cohort analysis:', error);
      throw new Error('Failed to fetch cohort analysis');
    }

    const today = new Date();
    const cohortMap = new Map();

    data.forEach(row => {
      const cohortKey = row.cohort_date_out.split('T')[0];

      if (!cohortMap.has(cohortKey)) {
        cohortMap.set(cohortKey, {
          cohort_date: cohortKey,
          cohort_size: row.cohort_size,
          days: {},
        });
      }

      const cohort = cohortMap.get(cohortKey);
      cohort.days[`day_${row.days_since_cohort}`] = row.retention_rate || 0;
    });

    // Find the maximum number of days since the earliest cohort
    let maxDaysSinceStart = 0;
    cohortMap.forEach((cohort, key) => {
      const cohortStartDate = new Date(key);
      const daysSinceStart = Math.floor((today.getTime() - cohortStartDate.getTime()) / (1000 * 60 * 60 * 24));
      maxDaysSinceStart = Math.max(maxDaysSinceStart, daysSinceStart);
    });

    const transformedData = Array.from(cohortMap.values()).map(cohort => {
      // Ensure each cohort has entries up to maxDaysSinceStart, fill missing with 0
      for (let day = 0; day <= maxDaysSinceStart; day++) {
        cohort.days[`day_${day}`] = cohort.days[`day_${day}`] ?? 0;
      }

      // Sort the days within each cohort
      cohort.days = Object.keys(cohort.days)
        .sort((a, b) => parseInt(a.replace('day_', '')) - parseInt(b.replace('day_', '')))
        .reduce((obj, key) => {
          obj[key] = cohort.days[key];
          return obj;
        }, {});

      return cohort;
    });

    // Sort cohorts by date
    transformedData.sort((a, b) => new Date(a.cohort_date).getTime() - new Date(b.cohort_date).getTime());

    return transformedData;
  } catch (error) {
    console.error('Unexpected error fetching cohort analysis:', error);
    throw error;
  }
}

async getCohortAnalysisView(getCohortAnalysisDto: GetCohortAnalysisDto) {
  const { limit, offset } = getCohortAnalysisDto;

  try {
    const { data, error } = await this.supabase
      .from('cohort_analysis_view')
      .select('*')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching cohort analysis from materialized view:', error);
      throw new Error('Failed to fetch cohort analysis');
    }

    let maxDay = 0;
    const today = new Date();
    // Transform the raw data into structured format
    const transformedData = data.reduce((acc, { cohort_date_out, days_since_cohort, cohort_size, retention_rate }) => {
      const cohortKey = cohort_date_out.split('T')[0];
      if (!acc[cohortKey]) {
        acc[cohortKey] = { cohort_date: cohortKey, cohort_size, days: {} };
      }

      acc[cohortKey].days[`day_${days_since_cohort}`] = retention_rate || 0;
      maxDay = Math.max(maxDay, days_since_cohort); // Track the maximum day index across all cohorts

      return acc;
    }, {});

    // Fill missing days with 0 and sort days within each cohort
    Object.values(transformedData).forEach((cohort: any) => {
      const cohortStartDate = new Date(cohort.cohort_date);
      const daysSinceStart = Math.floor((today.getTime() - cohortStartDate.getTime()) / (1000 * 60 * 60 * 24));
      for (let day = 0; day <= daysSinceStart; day++) {
        cohort.days[`day_${day}`] = cohort.days[`day_${day}`] ?? 0;
      }

      // Sort days within each cohort
      const sortedDays = Object.keys(cohort.days)
        .sort((a, b) => parseInt(a.substring(4)) - parseInt(b.substring(4))) // Extract day number and sort numerically
        .reduce((obj, key) => {
          obj[key] = cohort.days[key];
          return obj;
        }, {});

      cohort.days = sortedDays;
    });

    // Convert transformedData object into an array and sort cohorts by date
    const finalData = Object.values(transformedData).sort((a: any, b: any) => new Date(a.cohort_date).getTime() - new Date(b.cohort_date).getTime());

    return finalData;
  } catch (error) {
    console.error('Unexpected error fetching cohort analysis:', error);
    throw error;
  }
}


  async getTotalSolVolume() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_daily_total_sol_amount',
      );
      if (error) {
        console.error('Error fetching sol volume:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error fetching sol volume:', e);
      return null;
    }
  }

  async getBuyerCountByMint() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_buyer_count_by_mint',
      );
      if (error) {
        console.error('Error fetching buyer count by mint:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error fetching buyer count by mint:', e);
      return null;
    }
  }

  async getCoinsBoughtByUser() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_coins_bought_by_user',
      );
      if (error) {
        console.error('Error fetching coins bought by user:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error fetching coins bought by user:', e);
      return null;
    }
  }

  async getTradeCoinRatio() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_trade_and_coin_counts_with_ratio',
      );
      if (error) {
        console.error('Error fetching trades/coins ratio:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error fetching trades/coins ratio:', e);
      return null;
    }
  }

  async getTradeCount() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_trade_count_by_date',
      );
      if (error) {
        console.error('Error fetching trade count:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error fetching trade count:', e);
      return null;
    }
  }

  async getCreatorCoinCount() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_lifetime_coin_count_by_creator',
      );
      if (error) {
        console.error('Error fetching creator coin count:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error fetching creator coin count:', e);
      return null;
    }
  }

  async getTradeCountByUser() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_lifetime_trade_count_and_last_trade_date_by_user',
      );
      if (error) {
        console.error('Error fetching trade count by user:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error fetching trade count by user:', e);
      return null;
    }
  }

  async getTotalTvl() {
    try {
      const { data, error } = await this.supabase
        .from('tvl')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to fetch data from tvl table', error);
      return null;
    }
  }
  async getTxTracking(getTxTrackingDto: GetTxTrackingDto): Promise<GetTxTrackingDto[]> {
    try {
      const { limit = 1000, offset = 0 } = getTxTrackingDto;
      const { data, error } = await this.supabase
        .rpc('get_tx_stats', {
          p_limit: limit,
          p_offset: offset,
        });
      if (error) {
        console.error('Error fetching transaction tracking:', error);
        throw new Error('Failed to fetch transaction tracking');
      }
      
      return data.map(row => 
        {
          if (row.estimated_timestamp != null) {
            return {
              timePeriodStart: row.time_period_start,
              avgSlotDelta: row.avg_slot_delta,
              landRate: row.land_rate,
              estimatedTimestamp: row.estimated_timestamp,
            };
          }
          else {
            return null
          }
    }).filter((row) => row != null);
    } catch (error) {
      console.error('Unexpected error fetching transaction stats:', error);
      throw error;
    }
  }
  

  async getUniqueDailyUsers(getUniqueDailyUsersDto: GetUniqueDailyUsersDto): Promise<GetUniqueDailyUsersDto[]> {
    const { limit = 30, offset = 0 } = getUniqueDailyUsersDto;
  
    try {
      const { data, error } = await this.supabase
        .rpc('get_unique_daily_users', {
          p_limit: limit,
          p_offset: offset
        });
  
      if (error) {
        console.error('Error fetching unique daily users:', error);
        throw new Error('Failed to fetch unique daily users');
      }
  
      return data.map(row => ({
        tradeDay: row.trade_day, // Adjust according to your actual data structure
        dailyActiveUsers: row.daily_active_users
      }));
    } catch (error) {
      console.error('Unexpected error fetching unique daily users:', error);
      throw error;
    }
  }

  async getUniqueDailyUsersView(getUniqueDailyUsersDto: GetUniqueDailyUsersDto) {
    const { limit = 30, offset = 0 } = getUniqueDailyUsersDto;
  
    try {
      const { data, error } = await this.supabase
        .from('unique_daily_users_view')
        .select('*')
        // Adjusting for the Supabase client's handling of range; it uses starting and ending indices
        .range(offset, offset + limit - 1);
  
      if (error) {
        console.error('Error fetching unique daily users view:', error);
        throw new Error('Failed to fetch unique daily users view');
      }
  
      // Assuming the data returned matches the structure expected by UniqueDailyUsersDto
      return data.map(row => ({
        tradeDay: row.trade_day, // Adjust field names based on actual returned data
        dailyActiveUsers: row.daily_active_users
      }));
    } catch (error) {
      console.error('Unexpected error fetching unique daily users view:', error);
      throw error;
    }
  }

  async getCoinsLaunchedPerDay() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_coins_launched_per_day',
      );
      if (error) {
        console.error('Error fetching unique daily coins launched:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error(
        'Unexpected error fetching unique daily coins launched:',
        e,
      );
      return null;
    }
  }

  async getAvgSolTradedPerDay() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_average_trade_size_per_day',
      );
      if (error) {
        console.error('Error fetching avg daily sol trade amount:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('Unexpected error fetching avg daily sol trade amount:', e);
      return null;
    }
  }
}