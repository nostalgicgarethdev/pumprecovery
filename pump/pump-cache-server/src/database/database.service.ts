import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

interface Profile {
  calls: number;
  totalCallDuration: number;
}

@Injectable()
export class DatabaseService {
  supabase: SupabaseClient;
  profileCache: Record<string, Profile> = {};

  constructor(private configService: ConfigService) {
    this.supabase = this.getSupabase();

    console.log('starting db service');
    setInterval(() => {
      console.log(
        'profile cache',
        Object.fromEntries(
          Object.entries(this.profileCache)
            .sort((a, b) => b[1].totalCallDuration - a[1].totalCallDuration)
            .map(([key, { calls, totalCallDuration }]) => {
              return [
                key,
                {
                  calls,
                  totalCallDuration:
                    (totalCallDuration / 1000).toFixed(2) + 's',
                },
              ] as [string, any];
            }),
        ),
      );
    }, 60_000);
  }

  async startProfile(name: string): Promise<number> {
    if (!this.profileCache[name]) {
      this.profileCache[name] = { calls: 0, totalCallDuration: 0 };
    }

    return Date.now();
  }

  async endProfile(name: string, duration: number) {
    this.profileCache[name].calls += 1;
    this.profileCache[name].totalCallDuration += duration;
  }

  getSupabase(): SupabaseClient {
    return createClient(
      this.configService.get('supabaseUrl'),
      this.configService.get('supabaseKey'),
    );
  }

  async getCoins(
    limit: number = 50,
    offset: number = 0,
    sort: string,
    includeNsfw: boolean,
    searchTerm?: string,
    order?: string,
    creator?: string,
  ) {
    console.log('calling db fetch');

    const startTime = await this.startProfile('getCoins');
    const params: any = {
      p_limit: limit,
      p_offset: offset,
      p_sort_key: sort,
      p_sort_direction: order || 'DESC',
      p_include_nsfw: includeNsfw,
    };

    if (searchTerm) params.p_search_term = searchTerm;
    if (creator) params.p_creator = creator;

    let query = this.supabase.rpc('get_coins', params);

    try {
      const { data: coins, error } = await query;

      this.endProfile('getCoins', Date.now() - startTime);
      if (error) {
        throw error;
      }

      return coins;
    } catch (e) {
      console.error('Error fetching coins:', e);
      return null;
    }
  }
}
