import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TradesController } from './trades/trades.controller';
import { TradesModule } from './trades/trades.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database/database.service';
import { CoinsController } from './coins/coins.controller';
import { CoinsService } from './coins/coins.service';
import { CoinsModule } from './coins/coins.module';
import { SolPriceModule } from './sol-price/sol-price.module';
import configuration from './config/configuration';
import { CandlesticksModule } from './candlesticks/candlesticks.module';
import { AuthModule } from './auth/auth.module';
import { RepliesModule } from './replies/replies.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GlobalParamsModule } from './global-params/global-params.module';
import { BalancesModule } from './balances/balances.module';
import { SolProviderModule } from './sol-provider/sol-provider.module';
import { LikesModule } from './likes/likes.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SendTransactionModule } from './send-transaction/send-transaction.module';
import { JitoTipsModule } from './jito-tips/jito-tips.module';
import { DatabaseModule } from './database/database.module';
import { FollowingService } from './following/following.service';
import { FollowingModule } from './following/following.module';
import { MirrorsModule } from './mirrors/mirrors.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 150, // raised; many public reads per page load (coins, candles, replies, sol-price, trades...)
      },
    ]),
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
      load: [configuration],
    }),
    TradesModule,
    CoinsModule,
    SolPriceModule,
    CandlesticksModule,
    AuthModule,
    RepliesModule,
    GlobalParamsModule,
    BalancesModule,
    SolProviderModule,
    LikesModule,
    UsersModule,
    NotificationsModule,
    SendTransactionModule,
    JitoTipsModule,
    DatabaseModule,
    FollowingModule,
    MirrorsModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    FollowingService,
  ],
})
export class AppModule {}
