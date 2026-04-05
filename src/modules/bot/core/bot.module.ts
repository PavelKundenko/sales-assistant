import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { SteamModule } from '../../steam/steam.module';
import { telegramConfig } from '../../../configuration';
import { SalesMessageBuilder } from '../messaging/builders/sales-message.builder';
import { WishlistMessageBuilder } from '../messaging/builders/wishlist-message.builder';
import { UsersModule } from '../../users/users.module';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { SalesDigestJob } from '../jobs/sales-digest.job';
import { BOT_MESSENGER } from './bot.types';
import { TelegramBotMessenger } from '../infra/telegram-bot.messenger';
import { KeyboardBuilder } from '../messaging/keyboard.builder';
import { BotMessages } from '../messaging/bot.messages';
import { BotContextService } from './bot-context.service';
import { BotTextRouter } from '../routing/bot-text-router';
import { BotResponder } from './services/bot-responder.service';
import { BotRequestGuard } from './services/bot-request.guard';
import { BotSettingsService } from './services/bot-settings.service';
import { BotSalesService } from './services/bot-sales.service';
import { BotWishlistService } from './services/bot-wishlist.service';
import { BotSubscriptionService } from './services/bot-subscription.service';
import { BotAdminService } from './services/bot-admin.service';
import { BotStartService } from './services/bot-start.service';
import { BotHelpService } from './services/bot-help.service';
import { MenuStepHandler } from './services/settings/menu-step.handler';
import { FrequencyStepHandler } from './services/settings/frequency-step.handler';
import { PlatformsStepHandler } from './services/settings/platforms-step.handler';
import {
  BOT_KEYBOARD_BUILDER,
  BOT_SALES_MESSAGE_BUILDER,
  BOT_STEAM_SERVICE,
  BOT_SUBSCRIPTIONS_SERVICE,
  BOT_USER_PREFERENCES_SERVICE,
  BOT_USERS_SERVICE,
  BOT_WISHLIST_MESSAGE_BUILDER,
} from '../ports/bot.ports';
import { SteamService } from '../../steam/steam.service';
import { UsersService } from '../../users/users.service';
import { UserPreferencesService } from '../../users/user-preferences.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { WishlistDigestJob } from '../jobs/wishlist-digest.job';
import { DigestJobRunner } from '../jobs/digest-job.runner';

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
  providers: [
    BotUpdate,
    BotService,
    BotResponder,
    BotRequestGuard,
    BotSettingsService,
    MenuStepHandler,
    FrequencyStepHandler,
    PlatformsStepHandler,
    BotSalesService,
    BotWishlistService,
    BotSubscriptionService,
    BotAdminService,
    BotStartService,
    BotHelpService,
    SalesMessageBuilder,
    WishlistMessageBuilder,
    SalesDigestJob,
    WishlistDigestJob,
    DigestJobRunner,
    KeyboardBuilder,
    BotMessages,
    BotContextService,
    BotTextRouter,
    { provide: BOT_STEAM_SERVICE, useExisting: SteamService },
    { provide: BOT_USERS_SERVICE, useExisting: UsersService },
    { provide: BOT_USER_PREFERENCES_SERVICE, useExisting: UserPreferencesService },
    { provide: BOT_SUBSCRIPTIONS_SERVICE, useExisting: SubscriptionsService },
    { provide: BOT_SALES_MESSAGE_BUILDER, useExisting: SalesMessageBuilder },
    { provide: BOT_WISHLIST_MESSAGE_BUILDER, useExisting: WishlistMessageBuilder },
    { provide: BOT_KEYBOARD_BUILDER, useExisting: KeyboardBuilder },
    { provide: BOT_MESSENGER, useClass: TelegramBotMessenger },
  ],
})
export class BotModule {}
