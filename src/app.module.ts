import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './modules/bot/core/bot.module';
import { SteamModule } from './modules/steam/steam.module';
import { UsersModule } from './modules/users/users.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { steamConfig, telegramConfig } from './configuration';
import { dataSourceOptions } from '../data-source.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [telegramConfig, steamConfig],
      validationSchema: Joi.object({
        TELEGRAM_BOT_TOKEN: Joi.string().min(1).required(),
        STEAM_API_URL: Joi.string().uri().required(),
        DATABASE_URL: Joi.string().uri().required(),
      }),
      validationOptions: {
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      migrationsRun: false,
    }),
    ScheduleModule.forRoot(),
    BotModule,
    SteamModule,
    UsersModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
