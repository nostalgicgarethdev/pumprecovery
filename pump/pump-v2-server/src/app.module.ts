import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CandlesticksModule } from './candlesticks/candlesticks.module';
import { DatabaseService } from './database/database.service';
import configuration from './config/configuration';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoinsModule } from './coins/coins.module';
import { MessagesModule } from './messages/messages.module';
import { TradesModule } from './trades/trades.module';
import { UsersModule } from './users/users.module';
// import { AuthModule } from './auth/auth.module';
// import { AuthController } from './auth/auth.controller';
import { JwtService } from '@nestjs/jwt';
import { SeedPoolModule } from './seed-pool/seed-pool.module';
import { SolPriceModule } from './sol-price/sol-price.module';
import { EventListenerModule } from './event-listener/event-listener.module';
import { SocialAuthModule } from './social-auth/social-auth.module';
import { SocialAuthController } from './social-auth/social-auth.controller';
import { UsersService } from './users/users.service';
import { EventListenerService } from './event-listener/event-listener.service';
import { CommentsService } from './comments/comments.service';
import { CommentsController } from './comments/comments.controller';
import { CommentsModule } from './comments/comments.module';
import { LikesService } from './likes/likes.service';
import { LikesModule } from './likes/likes.module';
import { rateLimitMiddleware } from './rate-limit.middleware';
import { GlobalParamsModule } from './global-params/global-params.module';
import { BalancesModule } from './balances/balances.module';
import { TradesGateway } from './trades/trades.gateway';
import { OrchestratorModule } from './orchestrator/orchestrator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
      load: [configuration],
    }),
    CandlesticksModule,
    EventEmitterModule.forRoot(),
    CoinsModule,
    MessagesModule,
    TradesModule,
    UsersModule,
    // AuthModule,
    SeedPoolModule,
    SolPriceModule,
    SocialAuthModule,
    EventListenerModule,
    CommentsModule,
    LikesModule,
    GlobalParamsModule,
    BalancesModule,
    OrchestratorModule,
  ],
  controllers: [
    AppController,
    // AuthController,
    SocialAuthController,
    CommentsController,
  ],
  providers: [
    AppService,
    DatabaseService,
    UsersService,
    JwtService,
    CommentsService,
    LikesService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(rateLimitMiddleware()).forRoutes('*'); // Apply to all routes
  }
}
