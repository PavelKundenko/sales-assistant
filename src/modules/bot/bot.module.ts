import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { SteamModule } from '../steam/steam.module';
import { telegramConfig } from '../../configuration';
import { SalesMessageBuilder } from './sales-message.builder';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [telegramConfig.KEY],
      useFactory: (config: ConfigType<typeof telegramConfig>) => ({
        token: config.botToken,
      }),
    }),
    SteamModule,
    UsersModule,
    SubscriptionsModule,
  ],
  providers: [BotUpdate, BotService, SalesMessageBuilder],
})
export class BotModule {}
