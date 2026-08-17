import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Candlestick } from 'src/candlesticks/entities/candlestick.entity';
import { GetCoinsDto } from 'src/coins/dto/get-coins.dto';
import { randomBytes } from 'crypto';
import { Coin } from 'src/coins/entities/coin.entity';
import { Trade } from 'src/trades/entities/trade.entity';
import { User } from 'src/users/entities/user.entity';
import { GetUsersDto } from 'src/users/dto/get-users.dto';
import { Comment } from 'src/comments/entities/comment.entity';

@Injectable()
export class DatabaseService {
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

  async createUser(user: User) {
    try {
      const { data, error } = await this.supabase.from('users').insert([user]);

      if (error) {
        throw error;
      }

      console.log('created user: ', data);
    } catch (error) {
      console.log(user);
      console.log('error creating user: ', error);
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

  async getUser(uniqueKey: string, value: string): Promise<any> {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq(uniqueKey, value)
        .single();

      if (error) {
        throw error;
      }

      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getUser2(address: string) {
    try {
      const { data: user, error } = await this.supabase.rpc('get_user2', {
        p_address: address,
      });

      if (error) {
        throw error;
      }

      return user[0];
    } catch (e) {
      console.error('Error fetching user:', e);
      return null;
    }
  }

  async updateUser(user: any) {
    try {
      const userToUpdate = { ...user };
      delete userToUpdate.id;

      const { error } = await this.supabase
        .from('users')
        .update(userToUpdate)
        .eq('twitter_username', user.twitter_username);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }

    console.log('updated user:', user.twitter_username);
  }

  async generateUniqueMessage(username: string) {
    const uniqueString = randomBytes(16).toString('hex');

    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          msg: `Sign in with @${username}: ${uniqueString}`,
          timestamp: Date.now(),
        })
        .select('*');

      if (error) {
        throw error;
      }

      console.log('created msg: ', data);
      return data[0];
    } catch (e) {
      console.error('Error creating msg: ', e);
      return null;
    }
  }

  async getLatestVerifiedMessageForUser(username: string) {
    try {
      const { data: msg, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('twitter_username', username)
        .eq('verified', true)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      return msg[0];
    } catch (e) {
      console.error('Error fetching message:', e);
      return null;
    }
  }

  async getMessage(uniqueKey: string, value: string): Promise<any> {
    try {
      const { data: msg, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq(uniqueKey, value)
        .single();

      if (error) {
        throw error;
      }

      return msg;
    } catch (e) {
      console.error('Error fetching message:', e);
      return null;
    }
  }

  async getMessageByUserAndAddress(
    username: string,
    address: string,
  ): Promise<any> {
    try {
      const { data: msg, error } = await this.supabase
        .from('messages')
        .select('*')
        .filter('twitter_username', 'eq', username)
        .filter('address', 'eq', address)
        .single();

      if (error) {
        throw error;
      }

      return msg;
    } catch (e) {
      console.error('Error fetching message by user and address:', e);
      return null;
    }
  }

  async updateMessage(msg: any) {
    try {
      console.log('updating message');

      const msgToUpdate = { ...msg };
      delete msgToUpdate.id;

      const { error } = await this.supabase
        .from('messages')
        .update(msgToUpdate)
        .eq('id', msg.id);

      if (error) {
        throw error;
      }

      console.log('updated msg:', msg);
    } catch (e) {
      console.log(msg);
      console.error('Error updating msg: ', e);
    }
  }

  async clearMessagesForUser(username: string) {
    try {
      const { error } = await this.supabase
        .from('messages')
        .delete()
        .eq('twitter_username', username);

      if (error) {
        throw error;
      }

      console.log('deleted messages for user:', username);
    } catch (e) {
      console.error('Error deleting messages for user:', e);
    }
  }

  async upsertCandlestick(candlestick: Candlestick, interval: number) {
    try {
      console.log(
        `Upserting candlestick: ${
          (candlestick.mint, candlestick.timestamp)
        } at ${new Date().toISOString()}`,
      );const table = interval === 900 ? 'candlesticks900' : interval === 1 ? 'candlestick1' : 'candlesticks';
      const { data: msg, error } = await this.supabase
        .from(table)
        .upsert(candlestick);
      console.log(
        `Upserted candlestick: ${
          (candlestick.mint, candlestick.timestamp)
        } at ${new Date().toISOString()}`,
      );

      if (error) {
        throw error;
      }

      console.log('updated or created candlestick: ', candlestick);
    } catch (e) {
      console.error('Error updating or creating candlestick: ', e, candlestick);
    }
  }

  async getLatestCandlestick(
    mint?: string,
    maxTimestamp?: number,
    interval: number = 60 * 5,
  ): Promise<any> {
    try {const table = interval === 900 ? 'candlesticks900' : interval === 1 ? 'candlestick1' : 'candlesticks';
    let query = this.supabase.from(table).select('*');
      if (mint) query = query.eq('mint', mint);
      if (maxTimestamp) query = query.lt('timestamp', maxTimestamp);

      console.log(`Fetching latest candlestick at ${new Date().toISOString()}`);
      const { data: msg, error } = await query
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      console.log(`Fetched latest candlestick at ${new Date().toISOString()}`);

      return msg[0];
    } catch (e) {
      console.error('Error fetching latest candlestick:', e);
      return null;
    }
  }

  async getCandleStick(mint: string, timestamp: number, interval: number = 5 * 60) {

      console.log(`Fetching candlestick at ${new Date().toISOString()}`);
      try {
        const table = interval === 900 ? 'candlesticks900' : interval === 1 ? 'candlestick1' : 'candlesticks';
      
      const { data: msg, error } = await this.supabase
      .from(table)
        .select('*')
        .eq('mint', mint)
        .eq('timestamp', timestamp)
        .single();

      if (error) {
        throw error;
      }

      console.log(`Fetched candlestick at ${new Date().toISOString()}`);

      return msg;
    } catch (e) {
      console.error('Error fetching candlestick:', e);
      return null;
    }
  }

  async getNextCandlestick(mint: string, timestamp: number, interval: number = 5 * 60) {
    try {
      console.log(`Fetching candlestick at ${new Date().toISOString()}`);
      const table = interval === 900 ? 'candlesticks900' : interval === 1 ? 'candlestick1' : 'candlesticks';

      const { data: nextCandlestick, error } = await this.supabase
      .from(table)
        .select('*')
        .eq('mint', mint)
        .gt('timestamp', timestamp)
        .order('timestamp', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      console.log(`Fetched next candlestick at ${new Date().toISOString()}`);

      return nextCandlestick;
    } catch (e) {
      console.error('Error fetching next candlestick:', e);
      return null;
    }
  }

  async getCandlesticks(mint: string, limit: number = 1000, interval: number = 5 * 60): Promise<any> {
    try {
      const table = interval === 900 ? 'candlesticks900' : interval === 1 ? 'candlestick1' : 'candlesticks';

      const { data: msg, error } = await this.supabase
      .from(table)
        .select('*')
        .eq('mint', mint)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return msg.slice().reverse();
    } catch (e) {
      console.error('Error fetching candlesticks:', e);
      return null;
    }
  }

  async createCoin(coin: Coin) {
    try {
      const { error } = await this.supabase.from('coins').upsert(coin);

      if (error) {
        throw error;
      }

      console.log('created coin: ', coin);
    } catch (e) {
      console.log(coin);
      console.error('Error creating coin: ', e);
    }
  }

  async updateCoin(coin: Coin) {
    try {
      const { data, error } = await this.supabase
        .from('coins')
        .update(coin)
        .eq('mint', coin.mint);

      if (error) {
        throw error;
      }

      console.log('updated coin: ', data);
    } catch (e) {
      console.log(coin);
      console.error('Error updating coin: ', e);
    }
  }

  async getCoins({
    limit = 50,
    offset = 0,
    name,
    sort,
    order = 'DESC',
  }: GetCoinsDto) {
    // function that fetches coins with a sort and order then with a limit and offset
    // and also with an optional search term (name)

    limit = Math.min(50, limit);

    const params: any = {
      p_limit: limit,
      p_offset: offset,
      p_sort_key: sort,
      p_sort_direction: order,
    };

    if (name) params.p_search_term = name;

    let query = this.supabase.rpc('get_coins', params);

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

  async getCoinRaw(mint: string): Promise<any> {
    try {
      const { data: coin, error } = await this.supabase
        .from('coins')
        .select('*')
        .eq('mint', mint)
        .single();

      if (error) {
        throw error;
      }

      // console.log('fetched raw coin', coin);

      return coin;
    } catch (e) {
      console.error('Error fetching coin:', e);
      return null;
    }
  }

  async getCoinKingOfTheHill(): Promise<any> {
    try {
      const { data: coin, error } = await this.supabase
        .rpc('get_king_of_the_hill_coin')
        .single();

      if (error) {
        throw error;
      }

      return coin;
    } catch (e) {
      console.error('Error fetching king of the hill:', e);
      return null;
    }
  }

  async getCoin(uniqueKey: string, value: string): Promise<any> {
    try {
      const { data: coin, error } = await this.supabase
        .rpc('get_coins_with_user_details')
        .eq(uniqueKey, value)
        .single();

      if (error) {
        throw error;
      }

      return coin;
    } catch (e) {
      console.error('Error fetching coin:', e);
      return null;
    }
  }

  async getCoinByMint(mint: string): Promise<any> {
    try {
      const { data: coin, error } = await this.supabase
        .rpc('get_coin', {
          p_mint: mint,
        })
        .single();

      if (error) {
        throw error;
      }

      return coin;
    } catch (e) {
      console.error('Error fetching coin:', e);
      return null;
    }
  }

  async getLatestCoin(): Promise<Coin | null> {
    try {
      const { data: coin, error } = await this.supabase
        .from('coins')
        .select('*')
        .order('created_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      return coin;
    } catch (e) {
      console.error('Error fetching latest coin:', e);
      return null;
    }
  }

  async createTrade(trade: Trade) {
    try {
      console.log(
        `Upserting trade: ${
          (trade.mint, trade.timestamp)
        } at ${new Date().toISOString()}`,
      );
      const { data, error } = await this.supabase.from('trades').upsert(trade);

      console.log(
        `Upserted trade: ${
          (trade.mint, trade.timestamp)
        } at ${new Date().toISOString()}`,
      );

      if (error) {
        throw error;
      }

      console.log('created trade : ', data);
    } catch (e) {
      console.log(trade);
      console.error('Error creating trade: ', e);
    }
  }

  async getLatestTrade(): Promise<any> {
    try {
      let query = this.supabase.rpc('get_latest_trades_with_coin_details');

      const { data: trades, error } = await query.order('timestamp', {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      return trades[0];
    } catch (e) {
      console.error('Error fetching trades:', e);
      return null;
    }
  }

  async addTgGroup(groupChat: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('group_chats')
        .insert(groupChat);

      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error adding tg group:', e);
      return null;
    }
  }

  async updateTgGroup(groupChat: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('group_chats')
        .update(groupChat)
        .eq('chat_id', groupChat.chat_id);

      if (error) {
        console.error('Error updating tg group:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error updating tg group:', e);
      return null;
    }
  }

  async removeTgGroup(chatId: number): Promise<any> {
    try {
      const { error } = await this.supabase
        .from('group_chats')
        .delete()
        .eq('chat_id', chatId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (e) {
      console.error('Error removing tg group:', e);
      return null;
    }
  }

  async getTgGroup(chatId: number): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('group_chats')
        .select('*')
        .eq('chat_id', chatId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error fetching tg group:', e);
      return null;
    }
  }

  async getAllTgGroups(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('group_chats')
        .select('*');

      if (error) {
        throw error;
      }

      // Finding the index of the group chat with id "1001996676648"
      const specialGroupIndex = data.findIndex(
        (group) => group.chat_id == -1001996676648,
      );
      if (specialGroupIndex !== -1) {
        // Splicing the array to move the special group to the front
        const [specialGroup] = data.splice(specialGroupIndex, 1);
        data.unshift(specialGroup);
      }

      return data;
    } catch (e) {
      console.error('Error fetching tg groups:', e);
      throw e;
    }
  }

  async addPumpPalTgGroup(groupChat: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('pump_pal_group_chats')
        .insert(groupChat);

      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error adding tg group:', e);
      return null;
    }
  }

  async getAllPumpPalTgGroups(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('pump_pal_group_chats')
        .select('*');

      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error fetching tg groups:', e);
      return null;
    }
  }

  async removePumpPalTgGroup(chatId: number): Promise<any> {
    try {
      const { error } = await this.supabase
        .from('pump_pal_group_chats')
        .delete()
        .eq('chat_id', chatId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (e) {
      console.error('Error removing tg group:', e);
      return null;
    }
  }

  async upsertUserVisited(username: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    try {
      const { data, error } = await this.supabase
        .from('visits')
        .select('*')
        .eq('user', username)
        .gte('timestamp', todayTimestamp);

      if (error) throw error;

      if (data && data.length > 0) {
        const visitRecord = data[0];
        const updatedVisits = visitRecord.visits + 1;
        const { error: updateError } = await this.supabase
          .from('visits')
          .update({ visits: updatedVisits })
          .match({ user: username, timestamp: visitRecord.timestamp });

        if (updateError) throw updateError;
        console.log(`Incremented visits for user: ${username}`);
      } else {
        const { error: insertError } = await this.supabase
          .from('visits')
          .insert([{ user: username, visits: 1, timestamp: todayTimestamp }]);

        if (insertError) throw insertError;
        console.log(`Inserted first visit for user: ${username}`);
      }
    } catch (e) {
      console.error('Error upserting user visit:', e);
    }
  }

  async createTradingCompetitionEntry(
    user: string,
    volume: number,
    pnl: number,
    dailyPnl: number,
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('trading_competition')
        .insert({
          user: user,
          volume: volume,
          pnl: pnl,
          daily_pnl: dailyPnl,
        });

      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error creating/updating trading competition entry:', e);
      return null;
    }
  }

  async getTradingCompetitionEntry(
    uniqueKey: string,
    value: string,
  ): Promise<any> {
    try {
      const { data: msg, error } = await this.supabase
        .from('trading_competition')
        .select('*')
        .eq(uniqueKey, value)
        .single();

      if (error) {
        throw error;
      }

      return msg;
    } catch (e) {
      console.error('Error fetching trading competition entry:', e);
      return null;
    }
  }

  async getComment(signature: string) {
    try {
      const { data: comment, error } = await this.supabase
        .from('comments')
        .select('*')
        .eq('signature', signature)
        .single();

      if (error) {
        throw error;
      }

      return comment;
    } catch (e) {
      console.error('Error fetching comment:', e);
      return null;
    }
  }

  async createComment(comment: Comment) {
    try {
      const { data, error } = await this.supabase
        .from('comments')
        .insert([comment]);

      if (error) {
        throw error;
      }

      console.log('created comment: ', data);
    } catch (error) {
      console.log(comment);
      console.log('error creating comment: ', error);
    }
  }

  async updateComment(comment: Comment) {
    try {
      const { data, error } = await this.supabase
        .from('comments')
        .update([comment])
        .eq('signature', comment.signature);

      if (error) {
        console.log('error updating comment', error);
        return;
      }

      console.log('upserted comment: ', data);
    } catch (error) {
      console.log(comment);
      console.log('error upserting comment: ', error);
    }
  }

  async getComments(mintId: string) {
    try {
      // fetch all comments that are confirmed in timestamp order for the mint id
      const { data, error } = await this.supabase
        .rpc('get_comments_with_user_details', { mintid: mintId })
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.log('error fetching comments', error);
      }

      return data;
    } catch (e) {
      console.error('Error fetching comments:', e);
      return null;
    }
  }

  async createLike(targetId: string, username: string) {
    try {
      // fetch the user row from the username
      const user = await this.getUser('twitter_username', username);

      const { data, error } = await this.supabase
        .from('likes')
        .insert([{ target_id: targetId, username, pfp: user.pfp }]);

      if (error) {
        throw error;
      }

      console.log('created like: ', data);
    } catch (error) {
      console.log('error creating like: ', error);
    }
  }

  async getLikes(targetId: string) {
    try {
      const { data, error } = await this.supabase
        .from('likes')
        .select('*')
        .eq('target_id', targetId);

      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error fetching likes:', e);
      return null;
    }
  }

  async deleteLike(targetId: string, username: string) {
    try {
      const { error } = await this.supabase
        .from('likes')
        .delete()
        .eq('target_id', targetId)
        .eq('username', username);

      if (error) {
        throw error;
      }

      console.log('deleted likes for target:', targetId);
    } catch (e) {
      console.error('Error deleting likes for target:', e);
    }
  }

  async createTgUser(user_id: number, username: string, code: string) {
    try {
      const { data, error } = await this.supabase
        .from('tg_users')
        .insert([{ user_id, username, code }]);

      if (error) {
        throw error;
      }

      console.log('created tg user: ', data);
    } catch (error) {
      console.log('error creating tg user: ', error);
    }
  }

  async updateTgUser(tgUser: any) {
    try {
      const { data, error } = await this.supabase
        .from('tg_users')
        .update(tgUser)
        .eq('user_id', tgUser.user_id);

      if (error) {
        console.log('error updating tg user', error);
        throw error;
      }

      console.log('upserted tg user: ', data);
    } catch (error) {
      console.log(tgUser);
      console.log('error upserting tg user: ', error);
    }
  }

  async getTgUser(key: string, value: any) {
    try {
      const { data, error } = await this.supabase
        .from('tg_users')
        .select('*')
        .eq(key, value)
        .single();
      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error fetching tg user:', e);
      return null;
    }
  }

  async getTradingCompetitionEntries(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_trading_competition_with_user_details')
        .order('pnl', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error fetching tc entrants:', e);
      return null;
    }
  }

  async updateTradingCompetitionEntry(
    user: string,
    newVolume: number,
    newPnL: number,
    newDailyPnL: number,
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('trading_competition')
        .update({
          volume: newVolume,
          pnl: newPnL,
          daily_pnl: newDailyPnL,
        })
        .match({ user });

      if (error) {
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error updating trading competition volume:', e);
      return null;
    }
  }

  async createTransfer(transfer: {
    signature: string;
    mint: string;
    sol_amount: number;
    token_amount: number;
    user: string;
    timestamp: number;
  }) {
    try {
      const { data, error } = await this.supabase
        .from('transfers')
        .insert([transfer]);

      if (error) {
        throw error;
      }

      console.log('Transfer created: ', data);
      return data;
    } catch (error) {
      console.error('Error creating transfer: ', error);
      return null;
    }
  }

  async getBuysAndSells(
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('trades')
        .select('*')
        .gte('timestamp', startTimestamp)
        .lte('timestamp', endTimestamp);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        `Error fetching trades between timestamps: ${startTimestamp} and ${endTimestamp}`,
        error,
      );
      return null;
    }
  }

  async getBuysAndSellsForUser(
    startTimestamp: number,
    endTimestamp: number,
    user: string,
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('trades')
        .select('*')
        .gte('timestamp', startTimestamp)
        .lte('timestamp', endTimestamp)
        .eq('user', user);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        `Error fetching trades for user ${user} between timestamps: ${startTimestamp} and ${endTimestamp}`,
        error,
      );
      return null;
    }
  }

  async getCombinedTradesAndTransfers(
    startTimestamp: number,
    endTimestamp: number,
  ) {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_combined_trades_and_transfers',
        {
          start_timestamp: Number(startTimestamp),
          end_timestamp: Number(endTimestamp),
        },
      );

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        `Error fetching combined trades and transfers between timestamps: ${startTimestamp} and ${endTimestamp}`,
        error,
      );
      return null;
    }
  }

  async getPfpFromAddress(address: string): Promise<any> {
    try {
      const { data: messageData, error: messageError } = await this.supabase
        .from('messages')
        .select('*')
        .eq('address', address)
        .single();

      if (messageError) {
        throw messageError;
      }

      if (!messageData) {
        console.log('No message found for the given address.');
        return null;
      }

      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('twitter_username', messageData.twitter_username)
        .single();

      if (userError) {
        throw userError;
      }

      const result = {
        userAddress: address,
        pfp: userData ? userData.pfp : null,
        twitter_username: userData ? userData.twitter_username : null,
      };

      return result;
    } catch (error) {
      console.error('Error fetching message and user pfp:', error);
      return null;
    }
  }

  async createProfile(profile: {
    user: string;
    sold_30_min_score: number;
    sold_1_hr_score: number;
    amount_tokens_held_score: number;
    amount_tokens_bought_score: number;
    patron_count: number;
    don_count: number;
    dh_count: number;
  }): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .insert([profile]);

      if (error) {
        throw error;
      }

      console.log('Profile created: ', data);
      return data;
    } catch (error) {
      console.error('Error creating profile: ', error);
      return null;
    }
  }

  async updateProfile(
    uniqueKey: string,
    value: string,
    updateData: any,
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updateData)
        .eq(uniqueKey, value);

      if (error) {
        throw error;
      }

      console.log('Profile updated: ', data);
      return data;
    } catch (error) {
      console.error('Error updating profile: ', error);
      return null;
    }
  }

  async getProfile(uniqueKey: string, value: string): Promise<any> {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq(uniqueKey, value)
        .single();

      if (error) {
        throw error;
      }

      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  async getProfileRankByKeyValue(key: string, value: string): Promise<any> {
    const profile = await this.getProfile(key, value);

    if (!profile) {
      return { error: 'Profile not found.' };
    }
    const profileRank = this.calculateRank(profile);
    return profileRank;
  }

  calculateRank(profile: any): { value: string; score: number } {
    const rankObject = {
      who_are_you: 0,
      ten_cent_whale: 2,
      accumulator: 5,
      chart_shark: 20,
      baron_von_pump: 50,
    };

    const scoreSum =
      profile.sold_30_min_score +
      profile.sold_1_hr_score +
      profile.amount_tokens_held_score +
      profile.amount_tokens_bought_score;

    if (scoreSum < 0) {
      return { value: 'who_are_you', score: scoreSum };
    }

    let rank = null;
    for (const [key, value] of Object.entries(rankObject)) {
      if (scoreSum >= value) {
        rank = key;
      } else {
        break;
      }
    }

    return rank
      ? { value: rank, score: parseFloat(scoreSum.toFixed(2)) }
      : { value: 'who_are_you', score: 0 };
  }

  async upsertGlobalParams(globalParams: any) {
    try {
      const { data, error } = await this.supabase
        .from('global_params')
        .upsert([globalParams]);

      if (error) {
        throw error;
      }

      console.log('upserted global params: ', data);
    } catch (error) {
      console.log(globalParams);
      console.log('error upserting global params: ', error);
    }
  }

  async getGlobalParamsAtTimestamp(timestamp: number) {
    try {
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

      return data;
    } catch (error) {
      console.error('Error fetching global params at slot:', timestamp, error);
      return null;
    }
  }

  async upsertBalance(balanceEntry) {
    try {
      const { data, error } = await this.supabase
        .from('balances')
        .upsert(balanceEntry);

      if (error) {
        throw error;
      }

      console.log('Upserted balance: ', data);
    } catch (e) {
      console.error('Error upserting balance: ', e);
      return null;
    }
  }
}
