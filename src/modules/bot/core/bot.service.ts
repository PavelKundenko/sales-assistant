import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import type { BotRequest } from './bot.types';
import { BotResponder } from './services/bot-responder.service';
import { BotSettingsService } from './services/bot-settings.service';
import { BotSalesService } from './services/bot-sales.service';
import { BotWishlistService } from './services/bot-wishlist.service';
import { BotSubscriptionService } from './services/bot-subscription.service';
import { BotAdminService } from './services/bot-admin.service';
import { BotStartService } from './services/bot-start.service';
import { BotHelpService } from './services/bot-help.service';
import { BotRequestGuard } from './services/bot-request.guard';
import { BotMessages } from '../messaging/bot.messages';
import type { SubscriptionEntity } from '../../subscriptions/entities/subscription.entity';
import type { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class BotService implements OnApplicationBootstrap {
  constructor(
    private readonly responder: BotResponder,
    private readonly settingsService: BotSettingsService,
    private readonly salesService: BotSalesService,
    private readonly wishlistService: BotWishlistService,
    private readonly subscriptionService: BotSubscriptionService,
    private readonly adminService: BotAdminService,
    private readonly startService: BotStartService,
    private readonly helpService: BotHelpService,
    private readonly requestGuard: BotRequestGuard,
    private readonly messages: BotMessages,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.responder.setMyCommands([
      { command: 'start', description: 'Початок роботи' },
      { command: 'sales', description: '🔥 Актуальні знижки' },
      { command: 'wishlist', description: '📋 Список бажаного' },
      { command: 'setup_wishlist', description: "🔗 Прив'язати Steam ID" },
      { command: 'settings', description: '⚙️ Налаштування' },
      { command: 'help', description: 'ℹ️ Довідка' },
    ]);
  }

  async handleStart(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    await this.startService.handleStart(request);
  }

  async handleSalesCommand(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    await this.salesService.handleSalesCommand(request);
  }

  async handleHelp(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    await this.helpService.handleHelp(request);
  }

  async handleSubscribeCommand(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    const context = await this.requestGuard.requireContext(request);

    if (!context) {
      return;
    }

    await this.handleSubscribe(context.chatId, context.user, context.activeSubscription);
  }

  async handleUnsubscribeCommand(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    const context = await this.requestGuard.requireContext(request);

    if (!context) {
      return;
    }

    await this.handleUnsubscribe(context.chatId, context.activeSubscription, Boolean(context.user.steamId));
  }

  async handleWishlistCommand(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    const context = await this.requestGuard.requireContext(request);

    if (!context) {
      return;
    }

    await this.wishlistService.handleWishlistCommand(context);
  }

  async handleConnectWishlistCommand(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    const context = await this.requestGuard.requireContext(request);

    if (!context) {
      return;
    }

    await this.wishlistService.handleConnectWishlistCommand(context);
  }

  async handleSetupWishlistCommand(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    const context = await this.requestGuard.requireContext(request);

    if (!context) {
      return;
    }

    await this.wishlistService.handleSetupWishlistCommand(request, context);
  }

  async handlePostCommand(request: BotRequest): Promise<void> {
    this.settingsService.clearSession(request.telegramUserId);
    await this.adminService.handlePostCommand(request);
  }

  async handleTextCommand(request: BotRequest): Promise<void> {
    const context = await this.requestGuard.requireContext(request);

    if (!context || !request.text) {
      return;
    }

    if (await this.settingsService.handleSettingsFlow(request, context)) {
      return;
    }

    if (!context.user.steamId) {
      const handled = await this.wishlistService.tryHandleSteamIdFromText(request.text, context);

      if (handled) {
        return;
      }
    }

    await this.sendUnknownText(context.chatId, Boolean(context.activeSubscription), Boolean(context.user.steamId));
  }

  async handleSettingsCommand(request: BotRequest): Promise<void> {
    const context = await this.requestGuard.requireContext(request);

    if (!context) {
      return;
    }

    await this.settingsService.openSettingsMenu(context.chatId, request.telegramUserId);
  }

  async handleSubscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    user: UserEntity,
    activeSubscription: SubscriptionEntity | null,
  ): Promise<void> {
    await this.subscriptionService.subscribe(chatId, user, activeSubscription);
  }

  async handleUnsubscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    activeSubscription: SubscriptionEntity | null,
    hasSteamId: boolean,
  ): Promise<void> {
    await this.subscriptionService.unsubscribe(chatId, activeSubscription, hasSteamId);
  }

  async handleSteamIdSetup(
    chatId: NonNullable<BotRequest['chatId']>,
    user: UserEntity,
    steamId: string,
    isSubscribed: boolean,
  ): Promise<void> {
    await this.wishlistService.handleSteamIdSetup(chatId, user, steamId, isSubscribed);
  }

  async sendUnknownText(
    chatId: NonNullable<BotRequest['chatId']>,
    isSubscribed: boolean,
    hasSteamId: boolean,
  ): Promise<void> {
    await this.responder.sendReply(chatId, this.messages.unknownTextMessage(isSubscribed, hasSteamId));
  }
}
