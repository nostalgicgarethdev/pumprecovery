import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
            .map(([key, { calls, totalCallDuration }]) => {
              return [
                key,
                {
                  calls,
                  totalCallDuration:
                    (totalCallDuration / 1000).toFixed(2) + 's',
                },
              ] as [string, any];
            })
            .sort((a, b) => b[1].calls - a[1].calls),
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

  async getLatestTrade(): Promise<any> {
    try {
      const startTime = await this.startProfile('getLatestTrade');
      const { data: trades, error } =
        await this.supabase.rpc('get_latest_trade');

      if (error) {
        throw error;
      }

      this.endProfile('getLatestTrade', Date.now() - startTime);
      return trades[0];
    } catch (e) {
      console.error('Error fetching trades:', e);
      return null;
    }
  }

  async getTrades(mint: string, limit: number, offset: number): Promise<any> {
    try {
      const startTime = await this.startProfile('getTrades');
      const { data: trades, error } = await this.supabase.rpc('get_trades', {
        p_input_mint: mint,
        p_limit: Math.min(limit, 200),
        p_offset: offset,
      });

      if (error) {
        throw error;
      }

      this.endProfile('getTrades', Date.now() - startTime);
      return trades;
    } catch (e) {
      console.error('Error fetching trades:', e);
      return null;
    }
  }

  async getCoinByMint(mint: string): Promise<any> {
    try {
      const startTime = await this.startProfile('getCoinByMint');
      const { data: coin, error } = await this.supabase
        .rpc('get_coin', {
          p_mint: mint,
        })
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getCoinByMint', Date.now() - startTime);
      return coin;
    } catch (e) {
      console.error('Error fetching coin:', e);
      return null;
    }
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

      if (error) {
        throw error;
      }

      this.endProfile('getCoins', Date.now() - startTime);
      return coins;
    } catch (e) {
      console.error('Error fetching coins:', e);
      return null;
    }
  }

  async getCoinKingOfTheHill(includeNsfw: boolean): Promise<any> {
    try {
      const startTime = await this.startProfile('getCoinKingOfTheHill');
      const { data: coin, error } = await this.supabase
        .rpc('get_king_of_the_hill_coin', {
          p_include_nsfw: includeNsfw,
        })
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getCoinKingOfTheHill', Date.now() - startTime);
      return coin;
    } catch (e) {
      console.error('Error fetching king of the hill:', e);
      return null;
    }
  }

  async getLatestCoin(): Promise<any> {
    try {
      const startTime = await this.startProfile('getLatestCoin');
      const { data: coin, error } = await this.supabase
        .from('coins')
        .select('*')
        .order('created_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getLatestCoin', Date.now() - startTime);
      return coin;
    } catch (e) {
      console.error('Error fetching latest coin:', e);
      return null;
    }
  }

  async updateCoin(coin: any) {
    try {
      const startTime = await this.startProfile('updateCoin');
      const { data, error } = await this.supabase
        .from('coins')
        .update(coin)
        .eq('mint', coin.mint);

      if (error) {
        throw error;
      }

      this.endProfile('updateCoin', Date.now() - startTime);
      console.log('updated coin: ', data);
    } catch (e) {
      console.log(coin);
      console.error('Error updating coin: ', e);
    }
  }

  async getCoinRaw(mint: string): Promise<any> {
    try {
      const startTime = await this.startProfile('getCoinRaw');
      const { data: coin, error } = await this.supabase
        .from('coins')
        .select('*')
        .eq('mint', mint)
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getCoinRaw', Date.now() - startTime);
      return coin;
    } catch (e) {
      console.error('Error fetching coin:', e);
      return null;
    }
  }

  async getCandlesticks(mint: string, interval?: number, limit: number = 1000): Promise<any> {
    try {
      const startTime = await this.startProfile('getCandlesticks');
      let table = 'candlesticks';
      if (interval === 900) table = 'candlesticks900';
      else if (interval === 1) table = 'candlestick1';
      let query = this.supabase
        .from(table)
        .select('*')
        .eq('mint', mint);
      // no interval filter, tables are separated by interval
      const { data: msg, error } = await query
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      this.endProfile('getCandlesticks', Date.now() - startTime);
      return (msg || []).slice().reverse();
    } catch (e) {
      console.error('Error fetching candlesticks:', e);
      return [];
    }
  }

  async createReply(reply: any): Promise<any> {
    try {
      const startTime = await this.startProfile('createReply');
      const { data, error } = await this.supabase
        .from('replies')
        .insert(reply)
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('createReply', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error creating reply:', e);
      return null;
    }
  }

  async getReplies(mint: string, user: string): Promise<any> {
    try {
      const startTime = await this.startProfile('getReplies');
      // direct query to avoid broken get_replies_for_mint RPC (bad columns)
      const { data: rawReplies, error } = await this.supabase
        .from('replies')
        .select('id, mint, file_uri, text, "user", timestamp, total_likes, hidden')
        .eq('mint', mint)
        .eq('hidden', false)
        .order('id', { ascending: true });

      if (error) {
        throw error;
      }

      let replies = (rawReplies || []).map((r: any) => ({
        ...r,
        username: null,
        profile_image: null,
        liked_by_user: false,
      }));

      if (replies.length > 0) {
        // fetch usernames/profile via users2
        const userAddrs = [...new Set(replies.map((r: any) => r.user).filter(Boolean))];
        if (userAddrs.length) {
          const { data: users } = await this.supabase
            .from('users2')
            .select('address, username, profile_image')
            .in('address', userAddrs);
          const uMap = new Map((users || []).map((u: any) => [u.address, u]));
          replies = replies.map((r: any) => {
            const u = uMap.get(r.user);
            return {
              ...r,
              username: u?.username || null,
              profile_image: u?.profile_image || null,
            };
          });
        }

        // liked_by_user for the requesting viewer
        if (user) {
          const ids = replies.map((r: any) => r.id);
          const { data: likes } = await this.supabase
            .from('likes')
            .select('target_id')
            .eq('user', user)
            .in('target_id', ids.map(String));
          const likedSet = new Set((likes || []).map((l: any) => Number(l.target_id)));
          replies = replies.map((r: any) => ({
            ...r,
            liked_by_user: likedSet.has(r.id),
          }));
        }
      }

      this.endProfile('getReplies', Date.now() - startTime);
      return replies;
    } catch (e) {
      console.error('Error fetching replies:', e);
      return [];
    }
  }

  async getUserReplies(
    address: string,
    limit: number,
    offset: number,
    includeHidden: boolean = false,
  ): Promise<any> {
    try {
      const startTime = await this.startProfile('getUserReplies');
      let query = this.supabase.from('replies').select('*').eq('user', address);

      if (!includeHidden) {
        query = query.eq('hidden', false);
      }

      query = query
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: replies, error } = await query;

      if (error) {
        throw error;
      }

      this.endProfile('getUserReplies', Date.now() - startTime);
      return replies;
    } catch (e) {
      console.error('Error fetching replies:', e);
      return null;
    }
  }

  async getAllReplies(limit: number, offset: number): Promise<any> {
    try {
      const startTime = await this.startProfile('getAllReplies');
      const { data: replies, error } = await this.supabase.rpc(
        'get_replies_with_ban_status',
        { p_limit: limit, p_offset: offset },
      );

      if (error) {
        throw error;
      }

      this.endProfile('getAllReplies', Date.now() - startTime);
      return replies;
    } catch (e) {
      console.error('Error fetching replies:', e);
      return null;
    }
  }

  async getGlobalParams() {
    try {
      const startTime = await this.startProfile('getGlobalParams');
      const { data, error } = await this.supabase
        .from('global_params')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      this.endProfile('getGlobalParams', Date.now() - startTime);
      return data;
    } catch (error) {
      console.error('Error fetching global params at slot:', error);
      return null;
    }
  }

  async getGlobalParamsAtTimestamp(timestamp: number) {
    try {
      const startTime = await this.startProfile('getGlobalParamsAtTimestamp');
      const { data, error } = await this.supabase
        .from('global_params')
        .select('*')
        .lte('timestamp', timestamp)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getGlobalParamsAtTimestamp', Date.now() - startTime);
      return data;
    } catch (error) {
      console.error('Error fetching global params at slot:', timestamp, error);
      return null;
    }
  }

  async isAdmin(address: string): Promise<boolean> {
    try {
      const startTime = await this.startProfile('isAdmin');
      const { data: admin, error } = await this.supabase
        .from('admins')
        .select('*')
        .eq('address', address)
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('isAdmin', Date.now() - startTime);
      return admin ? true : false;
    } catch (e) {
      console.error('Error fetching admin:', e);
      return false;
    }
  }

  async updateReply(reply: any) {
    try {
      const startTime = await this.startProfile('updateReply');
      const { data, error } = await this.supabase
        .from('replies')
        .update(reply)
        .eq('id', reply.id);

      if (error) {
        throw error;
      }

      this.endProfile('updateReply', Date.now() - startTime);
      console.log('updated reply: ', data);
    } catch (e) {
      console.log(reply);
      console.error('Error updating reply: ', e);
    }
  }

  async getReply(id: number): Promise<any> {
    try {
      const startTime = await this.startProfile('getReply');
      const { data: reply, error } = await this.supabase
        .from('replies')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getReply', Date.now() - startTime);
      return reply;
    } catch (e) {
      console.error('Error fetching reply:', e);
      return null;
    }
  }

  async upsertTxTracking(txTracking: any): Promise<any> {
    try {
      const startTime = await this.startProfile('upsertTxTracking');
      const { data, error } = await this.supabase
        .from('tx_tracking')
        .upsert(txTracking)
        .eq('signature', txTracking.signature);

      if (error) {
        throw error;
      }

      this.endProfile('upsertTxTracking', Date.now() - startTime);
      console.log('upsertedTxTracking: ', data);
    } catch (e) {
      console.log(txTracking);
      console.error('Error updating ban: ', e);
    }
  }

  async upsertBan(ban: any): Promise<any> {
    try {
      const startTime = await this.startProfile('upsertBan');
      const { data, error } = await this.supabase
        .from('bans')
        .upsert(ban)
        .eq('origin', ban.origin);

      if (error) {
        throw error;
      }

      this.endProfile('upsertBan', Date.now() - startTime);
      console.log('updated ban: ', data);
    } catch (e) {
      console.log(ban);
      console.error('Error updating ban: ', e);
    }
  }

  async getBan(origin: string): Promise<any> {
    try {
      const startTime = await this.startProfile('getBan');
      const { data, error } = await this.supabase
        .from('bans')
        .select('*')
        .eq('origin', origin)
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getBan', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error fetching ban: ', e);
    }
  }

  async upsertBalance(balanceEntry) {
    try {
      const startTime = await this.startProfile('upsertBalance');
      const { data, error } = await this.supabase
        .from('balances')
        .upsert(balanceEntry);

      if (error) {
        throw error;
      }

      this.endProfile('upsertBalance', Date.now() - startTime);
      console.log('Upserted balance: ', data);
    } catch (e) {
      console.error('Error upserting balance: ', e);
    }
  }

  async getBalances(address: string, offset: number, limit: number) {
    try {
      const startTime = await this.startProfile('getBalances');
      const { data: balances, error } = await this.supabase.rpc(
        'get_user_balances',
        {
          p_address: address,
          p_offset: offset,
          p_limit: limit,
        },
      );

      if (error) {
        throw error;
      }

      this.endProfile('getBalances', Date.now() - startTime);
      return balances;
    } catch (e) {
      console.error('Error fetching trades:', e);
      return null;
    }
  }

  async createLike(like: any) {
    try {
      const startTime = await this.startProfile('createLike');
      const { data, error } = await this.supabase.from('likes').insert(like);

      if (error) {
        throw error;
      }

      this.endProfile('createLike', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error creating like:', e);
      return e;
    }
  }

  async deleteLike(like: any) {
    try {
      const startTime = await this.startProfile('deleteLike');
      const { data, error } = await this.supabase
        .from('likes')
        .delete()
        .match(like);

      if (error) {
        throw error;
      }

      this.endProfile('deleteLike', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error deleting like:', e);
      return null;
    }
  }

  async getLikes(target_id: string) {
    try {
      const startTime = await this.startProfile('getLikes');
      const { data, error } = await this.supabase
        .from('likes')
        .select('*')
        .eq('target_id', target_id);

      if (error) {
        throw error;
      }

      this.endProfile('getLikes', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error fetching likes:', e);
      return null;
    }
  }

  async upsertUser(user: any) {
    try {
      const startTime = await this.startProfile('upsertUser');
      const { data, error } = await this.supabase
        .from('users2')
        .upsert(user)
        .eq('address', user.address)
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('upsertUser', Date.now() - startTime);
      console.log('upserted user: ', data);
      return data;
    } catch (e) {
      console.error('Error upserting user: ', e);
      return null;
    }
  }

  async getRawUser(address: string) {
    try {
      const startTime = await this.startProfile('getRawUser');
      const { data: user, error } = await this.supabase
        .from('users2')
        .select('*')
        .eq('address', address)
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getRawUser', Date.now() - startTime);
      return user;
    } catch (e) {
      console.error('Error fetching user:', e);
      return null;
    }
  }

  async getUser(address: string) {
    try {
      const startTime = await this.startProfile('getUser');
      const { data: user, error } = await this.supabase.rpc('get_user2', {
        p_address: address,
      });

      if (error) {
        throw error;
      }

      this.endProfile('getUser', Date.now() - startTime);
      return user[0];
    } catch (e) {
      console.error('Error fetching user:', e);
      return null;
    }
  }

  async getUserByUsername(username: string) {
    try {
      const startTime = await this.startProfile('getUserByUsername');
      const { data: user, error } = await this.supabase.rpc('get_user2', {
        p_username: username,
      });

      if (error) {
        throw error;
      }

      this.endProfile('getUserByUsername', Date.now() - startTime);
      return user[0];
    } catch (e) {
      console.error('Error fetching user:', e);
      return null;
    }
  }

  async createNotification(notification: any) {
    try {
      const startTime = await this.startProfile('createNotification');
      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notification);

      if (error) {
        throw error;
      }

      this.endProfile('createNotification', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error creating notification:', e);
      return null;
    }
  }

  async deleteNotification(
    type: 'mention' | 'like',
    target_id: string,
    source_user: string,
  ) {
    try {
      const startTime = await this.startProfile('deleteNotification');
      const { data, error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('type', type)
        .eq('target_id', target_id)
        .eq('source_user', source_user);

      if (error) {
        throw error;
      }

      this.endProfile('deleteNotification', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error deleting notification:', e);
      return null;
    }
  }

  async getNotifications(user: string, limit: number, offset: number) {
    try {
      const startTime = await this.startProfile('getNotifications');
      const { data, error } = await this.supabase.rpc(
        'fetch_notifications_with_replies',
        {
          p_user: user,
          p_limit: limit,
          p_offset: offset,
        },
      );

      if (error) {
        throw error;
      }

      this.endProfile('getNotifications', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error fetching notifications:', e);
      return null;
    }
  }

  async markNotificationsAsRead(user: string) {
    try {
      const startTime = await this.startProfile('markNotificationsAsRead');
      const { data, error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user', user);

      if (error) {
        throw error;
      }

      this.endProfile('markNotificationsAsRead', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error deleting notification:', e);
      return null;
    }
  }

  async createBanTerm(term: string) {
    try {
      const startTime = await this.startProfile('createBanTerm');
      const { data, error } = await this.supabase
        .from('ban_terms')
        .insert({ term });

      if (error) {
        throw error;
      }

      this.endProfile('createBanTerm', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error creating ban term:', e);
      return null;
    }
  }

  async getBanTerms() {
    try {
      const startTime = await this.startProfile('getBanTerms');
      const { data, error } = await this.supabase.from('ban_terms').select('*');

      if (error) {
        throw error;
      }

      this.endProfile('getBanTerms', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error fetching ban terms:', e);
      return null;
    }
  }

  async deleteBanTerm(id: string) {
    try {
      const startTime = await this.startProfile('deleteBanTerm');
      const { data, error } = await this.supabase
        .from('ban_terms')
        .delete()
        .eq('id', Number(id));

      if (error) {
        throw error;
      }

      this.endProfile('deleteBanTerm', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error deleting ban term:', e);
      return null;
    }
  }

  async createFollow(follow: any) {
    try {
      const startTime = await this.startProfile('createFollow');
      const { data, error } = await this.supabase
        .from('following')
        .insert(follow);

      if (error) {
        throw error;
      }

      this.endProfile('createFollow', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error creating follow:', e);
      return null;
    }
  }

  async deleteFollow(following_id: string, user_id: string) {
    try {
      const startTime = await this.startProfile('deleteFollow');
      const { data, error } = await this.supabase
        .from('following')
        .delete()
        .eq('following_id', following_id)
        .eq('user_id', user_id);

      if (error) {
        throw error;
      }

      this.endProfile('deleteFollow', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error deleting follow:', e);
      return null;
    }
  }

  async getFollow(following_id: string, user_id: string) {
    try {
      const startTime = await this.startProfile('getFollow');
      const { data, error } = await this.supabase
        .from('following')
        .select()
        .eq('following_id', following_id)
        .eq('user_id', user_id)
        .single();

      if (error) {
        throw error;
      }

      this.endProfile('getFollow', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error fetching is following:', e);
      return null;
    }
  }

  async getFollowers(id: string) {
    try {
      const startTime = await this.startProfile('getFollowers');
      const { data, error } = await this.supabase.rpc('get_followers', {
        user_address: id,
      });

      if (error) {
        throw error;
      }

      this.endProfile('getFollowers', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error fetching trades:', e);
      return null;
    }
  }

  async getFollowing(id: string) {
    try {
      const startTime = await this.startProfile('getFollowing');
      const { data, error } = await this.supabase.rpc('get_following', {
        user_address: id,
      });

      if (error) {
        throw error;
      }

      this.endProfile('getFollowing', Date.now() - startTime);
      return data;
    } catch (e) {
      console.error('Error fetching trades:', e);
      return null;
    }
  }

  /**
   * Self-registering mirror index. A mirror's browser sets the Origin header on
   * its cross-origin requests (ping / sign-in), giving us a trustworthy "this
   * mirror is live" signal. Atomic upsert via record_mirror(): inserts or bumps
   * last_seen + hits, and records the mirror's self-reported default referrer.
   */
  async recordMirror(origin: string, referrer?: string | null) {
    try {
      if (!origin || !/^https?:\/\/[^\s/]+$/.test(origin)) return;
      const normalized = origin.replace(/\/+$/, '');
      const p_referrer =
        referrer && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(referrer)
          ? referrer
          : null;
      const { error } = await this.supabase.rpc('record_mirror', {
        p_origin: normalized,
        p_referrer,
      });
      if (error) throw error;
    } catch (e) {
      console.error('Error recording mirror:', e);
    }
  }

  async getMirrors() {
    try {
      const { data, error } = await this.supabase
        .from('mirrors')
        .select(
          'origin, default_referrer, first_seen, last_seen, hits, verified',
        )
        .order('last_seen', { ascending: false })
        .limit(200);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (e) {
      console.error('Error fetching mirrors:', e);
      return [];
    }
  }
}
