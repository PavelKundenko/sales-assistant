import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { telegramConfig, type TelegramConfig } from '../../../configuration';
import {
  BOT_SALES_MESSAGE_BUILDER,
  BOT_STEAM_SERVICE,
  BOT_SUBSCRIPTIONS_SERVICE,
  BOT_USERS_SERVICE,
  BOT_WISHLIST_MESSAGE_BUILDER,
  type SalesMessageBuilderPort,
  type SteamServicePort,
  type SubscriptionsServicePort,
  type UsersServicePort,
  type WishlistMessageBuilderPort,
} from '../ports/bot.ports';
import { SubscriptionEntity, SubscriptionType } from '../../subscriptions/entities/subscription.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { BOT_MESSENGER, type BotMessenger, type BotRequest } from './bot.types';
import { BotContextService } from './bot-context.service';
import { BotMessages, type BotReply } from '../messaging/bot.messages';
import { filterByPlatform } from '../../steam/utils/platform-filter.util';
import { Platform, UserPreferencesEntity } from '../../users/entities/user-preferences.entity';
import {
  SETTINGS_BACK_BUTTON_LABEL,
  SETTINGS_DONE_BUTTON_LABEL,
  SETTINGS_FREQUENCY_BUTTON_LABEL,
  SETTINGS_PLATFORMS_BUTTON_LABEL,
} from './bot.constants';

type SettingsStep = 'menu' | 'frequency' | 'platforms';

@Injectable()
export class BotService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotService.name);
  private readonly settingsSessions = new Map<string, SettingsStep>();
  private readonly defaultPlatforms = [Platform.PC, Platform.MAC, Platform.STEAM_DECK];

  constructor(
    @Inject(BOT_MESSENGER)
    private readonly messenger: BotMessenger,
    @Inject(BOT_STEAM_SERVICE)
    private readonly steamService: SteamServicePort,
    @Inject(BOT_SALES_MESSAGE_BUILDER)
    private readonly salesMessageBuilder: SalesMessageBuilderPort,
    @Inject(BOT_WISHLIST_MESSAGE_BUILDER)
    private readonly wishlistMessageBuilder: WishlistMessageBuilderPort,
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    @Inject(BOT_SUBSCRIPTIONS_SERVICE)
    private readonly subscriptionsService: SubscriptionsServicePort,
    @Inject(telegramConfig.KEY)
    private readonly config: TelegramConfig,
    private readonly contextService: BotContextService,
    private readonly messages: BotMessages,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.messenger.setMyCommands([
      { command: 'start', description: 'Початок роботи' },
      { command: 'sales', description: '🔥 Актуальні знижки' },
      { command: 'wishlist', description: '📋 Список бажаного' },
      { command: 'setup_wishlist', description: "🔗 Прив'язати Steam ID" },
      { command: 'settings', description: '⚙️ Налаштування' },
      { command: 'help', description: 'ℹ️ Довідка' },
    ]);
  }

  async handleStart(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const telegramId = request.telegramUserId;
    const chatId = request.chatId;

    if (!telegramId || !chatId) {
      return;
    }

    const [user, created] = await this.usersService.createOrGet(telegramId.toString());

    const activeSubscriptions = await this.subscriptionsService.findActiveByUser(user.id);

    const isSubscribed = activeSubscriptions.some((subscription) => subscription.type === SubscriptionType.STEAM);

    const reply = this.messages.startMessage(created, isSubscribed, Boolean(user.steamId));

    await this.sendReply(chatId, reply);
  }

  async handleSalesCommand(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const chatId = request.chatId;
    const telegramId = request.telegramUserId;

    if (!chatId) {
      return;
    }

    await this.sendReply(chatId, this.messages.salesLoadingMessage());

    try {
      const { user } = await this.contextService.getSubscriptionContext(telegramId ?? undefined);

      const sales = await this.steamService.getCurrentSales();

      if (sales.length === 0) {
        await this.sendReply(chatId, this.messages.salesEmptyMessage());

        return;
      }

      const platforms = user?.preferences?.platform ?? [];

      const filteredSales = filterByPlatform(sales, platforms);

      if (filteredSales.length === 0) {
        await this.sendReply(chatId, this.messages.salesEmptyMessage());

        return;
      }

      const messageSequence = this.salesMessageBuilder.build(filteredSales, {
        intro: '🔥 Актуальні знижки у Steam:\n',
      });

      await this.messenger.sendMessageSequence(chatId, messageSequence);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const trace = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to handle /sales for ${telegramId ?? 'unknown'}: ${reason}`, trace);

      await this.sendReply(chatId, this.messages.salesErrorMessage());
    }
  }

  async handleHelp(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const chatId = request.chatId;

    if (!chatId) {
      return;
    }

    const { user, activeSubscription } = await this.contextService.getSubscriptionContext(
      request.telegramUserId ?? undefined,
    );

    const reply = this.messages.helpMessage(Boolean(activeSubscription), Boolean(user?.steamId));

    await this.sendReply(chatId, reply);
  }

  async handleSubscribeCommand(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const context = await this.validateRequest(request);

    if (!context) {
      return;
    }

    await this.handleSubscribe(context.chatId, context.user, context.activeSubscription);
  }

  async handleUnsubscribeCommand(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const context = await this.validateRequest(request);

    if (!context) {
      return;
    }

    await this.handleUnsubscribe(context.chatId, context.activeSubscription, Boolean(context.user.steamId));
  }

  async handleWishlistCommand(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const context = await this.validateRequest(request);

    if (!context) {
      return;
    }

    if (!context.user.steamId) {
      await this.sendReply(context.chatId, this.messages.steamIdGuideMessage());

      return;
    }

    await this.handleWishlist(context.chatId, context.user);
  }

  async handleConnectWishlistCommand(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const context = await this.validateRequest(request);

    if (!context) {
      return;
    }

    if (context.user.steamId) {
      await this.sendReply(context.chatId, this.messages.steamIdAlreadyConnectedMessage());

      return;
    }

    await this.sendReply(context.chatId, this.messages.steamIdGuideMessage());
  }

  async handleSetupWishlistCommand(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const context = await this.validateRequest(request);

    if (!context) {
      return;
    }

    const text = request.text;
    const args = text?.split(' ') ?? [];

    const potentialSteamId = args.length > 1 ? args[1] : null;

    if (!potentialSteamId) {
      await this.sendReply(context.chatId, this.messages.steamIdGuideMessage());

      return;
    }

    if (!this.isValidSteamId(potentialSteamId)) {
      await this.sendReply(context.chatId, this.messages.steamIdGuideMessage());

      return;
    }

    await this.handleSteamIdSetup(context.chatId, context.user, potentialSteamId, Boolean(context.activeSubscription));
  }

  async handlePostCommand(request: BotRequest): Promise<void> {
    this.clearSettingsSession(request.telegramUserId);
    const chatId = request.chatId;

    if (!chatId || !request.text) {
      return;
    }

    if (chatId !== this.config.adminId) {
      return;
    }

    const textPayload = request.text.replace('/post', '').trim();

    if (!textPayload) {
      await this.messenger.sendMessage(chatId, 'Please provide a message to send.');

      return;
    }

    const users = await this.usersService.findAllActive();

    let successCount = 0;

    for (const user of users) {
      try {
        await this.messenger.sendMessage(Number(user.telegramId), textPayload);

        successCount++;
      } catch (e) {
        this.logger.error(`Failed to send message to user ${user.telegramId}`, e);
      }
    }

    await this.messenger.sendMessage(chatId, `Message sent to ${successCount} active users.`);
  }

  async handleTextCommand(request: BotRequest): Promise<void> {
    const context = await this.validateRequest(request);

    if (!context || !request.text) {
      return;
    }

    const { chatId, user, activeSubscription } = context;

    if (await this.handleSettingsFlow(request, context)) {
      return;
    }

    if (!user.steamId) {
      const steamId = this.parseSteamId(request.text);

      if (steamId) {
        await this.handleSteamIdSetup(chatId, user, steamId, Boolean(activeSubscription));

        return;
      }
    }

    await this.sendUnknownText(chatId, Boolean(activeSubscription), Boolean(user.steamId));
  }

  async handleSettingsCommand(request: BotRequest): Promise<void> {
    const context = await this.validateRequest(request);

    if (!context) {
      return;
    }

    this.setSettingsStep(request.telegramUserId, 'menu');

    await this.sendReply(context.chatId, this.messages.settingsMenuMessage());
  }

  async handleSubscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    user: UserEntity,
    activeSubscription: SubscriptionEntity | null,
  ): Promise<void> {
    if (!activeSubscription) {
      await this.subscriptionsService.createForUser(user, SubscriptionType.STEAM);
    }

    await this.sendReply(chatId, this.messages.subscribeMessage(Boolean(user.steamId)));
  }

  async handleUnsubscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    activeSubscription: SubscriptionEntity | null,
    hasSteamId: boolean,
  ): Promise<void> {
    if (activeSubscription) {
      await this.subscriptionsService.deactivate(activeSubscription.id);
    }

    await this.sendReply(chatId, this.messages.unsubscribeMessage(hasSteamId));
  }

  private async handleWishlist(chatId: NonNullable<BotRequest['chatId']>, user: UserEntity): Promise<void> {
    const steamId = user.steamId!;
    await this.sendReply(chatId, this.messages.wishlistLoadingMessage());

    try {
      const items = await this.steamService.getWishlistItems(steamId);

      if (items.length === 0) {
        await this.sendReply(chatId, this.messages.wishlistEmptyMessage());

        return;
      }

      const messageSequence = this.wishlistMessageBuilder.build(items, {
        intro: '📋 Ваш список бажаного:\n',
      });

      await this.messenger.sendMessageSequence(chatId, messageSequence);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const trace = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to load wishlist for chat ${chatId}: ${reason}`, trace);

      await this.sendReply(chatId, this.messages.wishlistErrorMessage());
    }
  }

  // Keeping this public as it was effectively used by router before, but now effectively private/helper
  async handleSteamIdSetup(
    chatId: NonNullable<BotRequest['chatId']>,
    user: UserEntity,
    steamId: string,
    isSubscribed: boolean,
  ): Promise<void> {
    try {
      await this.steamService.resolveSteamUser(steamId);
      await this.usersService.setSteamId(user.id, steamId);

      await this.sendReply(chatId, this.messages.steamIdConnectedMessage(isSubscribed));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to connect Steam ID for user ${user.telegramId}: ${reason}`);
      await this.sendReply(chatId, this.messages.steamIdNotFoundMessage());
    }
  }

  async sendUnknownText(
    chatId: NonNullable<BotRequest['chatId']>,
    isSubscribed: boolean,
    hasSteamId: boolean,
  ): Promise<void> {
    await this.sendReply(chatId, this.messages.unknownTextMessage(isSubscribed, hasSteamId));
  }

  private async sendReply(chatId: NonNullable<BotRequest['chatId']>, reply: BotReply): Promise<void> {
    await this.messenger.sendMessage(chatId, reply.text, reply.options);
  }

  private async handleSettingsFlow(
    request: BotRequest,
    context: {
      chatId: NonNullable<BotRequest['chatId']>;
      user: UserEntity;
      activeSubscription: SubscriptionEntity | null;
    },
  ): Promise<boolean> {
    const key = this.getSettingsKey(request.telegramUserId);
    const step = key ? this.settingsSessions.get(key) : null;

    if (!step || !request.text) {
      return false;
    }

    const text = request.text;

    if (step === 'menu') {
      if (text === SETTINGS_FREQUENCY_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'frequency');
        const currentFrequency = this.getUserFrequency(context.user);

        await this.sendReply(context.chatId, this.messages.settingsFrequencyMessage(currentFrequency));

        return true;
      }

      if (text === SETTINGS_PLATFORMS_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'platforms');
        const platforms = this.getUserPlatforms(context.user);

        await this.sendReply(context.chatId, this.messages.settingsPlatformsMessage(platforms));

        return true;
      }

      if (text === SETTINGS_BACK_BUTTON_LABEL) {
        this.clearSettingsSession(request.telegramUserId);

        await this.sendReply(
          context.chatId,
          this.messages.settingsClosedMessage(Boolean(context.activeSubscription), Boolean(context.user.steamId)),
        );

        return true;
      }

      await this.sendReply(context.chatId, this.messages.settingsMenuMessage());

      return true;
    }

    if (step === 'frequency') {
      if (text === SETTINGS_BACK_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'menu');
        await this.sendReply(context.chatId, this.messages.settingsMenuMessage());

        return true;
      }

      const frequency = Number.parseInt(text, 10);

      if (!Number.isInteger(frequency) || frequency < 1 || frequency > 7) {
        await this.sendReply(context.chatId, this.messages.settingsFrequencyInvalidMessage());

        return true;
      }

      await this.usersService.updateUpdateFrequency(context.user.id, frequency);
      this.applyFrequencyToUser(context.user, frequency);
      this.setSettingsStep(request.telegramUserId, 'menu');

      await this.sendReply(context.chatId, this.messages.settingsFrequencyUpdatedMessage(frequency));

      return true;
    }

    if (step === 'platforms') {
      if (text === SETTINGS_BACK_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'menu');
        await this.sendReply(context.chatId, this.messages.settingsMenuMessage());

        return true;
      }

      if (text === SETTINGS_DONE_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'menu');
        await this.sendReply(context.chatId, this.messages.settingsPlatformsSavedMessage());

        return true;
      }

      const platform = this.parsePlatformLabel(text);

      if (!platform) {
        const platforms = this.getUserPlatforms(context.user);
        await this.sendReply(context.chatId, this.messages.settingsPlatformsMessage(platforms));

        return true;
      }

      const currentPlatforms = this.getUserPlatforms(context.user);
      const updatedPlatforms = currentPlatforms.includes(platform)
        ? currentPlatforms.filter((item) => item !== platform)
        : [...currentPlatforms, platform];

      await this.usersService.updatePlatforms(context.user.id, updatedPlatforms);
      this.applyPlatformsToUser(context.user, updatedPlatforms);

      await this.sendReply(context.chatId, this.messages.settingsPlatformsMessage(updatedPlatforms));

      return true;
    }

    return false;
  }

  private getSettingsKey(telegramUserId: number | null | undefined): string | null {
    if (!telegramUserId) {
      return null;
    }

    return telegramUserId.toString();
  }

  private setSettingsStep(telegramUserId: number | null | undefined, step: SettingsStep): void {
    const key = this.getSettingsKey(telegramUserId);

    if (!key) {
      return;
    }

    this.settingsSessions.set(key, step);
  }

  private clearSettingsSession(telegramUserId: number | null | undefined): void {
    const key = this.getSettingsKey(telegramUserId);

    if (!key) {
      return;
    }

    this.settingsSessions.delete(key);
  }

  private getUserPlatforms(user: UserEntity): Platform[] {
    return user.preferences?.platform ?? this.defaultPlatforms;
  }

  private getUserFrequency(user: UserEntity): number {
    return user.preferences?.salesUpdateFrequency ?? 1;
  }

  private applyPlatformsToUser(user: UserEntity, platforms: Platform[]): void {
    if (!user.preferences) {
      const preferences = new UserPreferencesEntity();
      preferences.platform = platforms;
      user.preferences = preferences;

      return;
    }

    user.preferences.platform = platforms;
  }

  private applyFrequencyToUser(user: UserEntity, frequency: number): void {
    if (!user.preferences) {
      const preferences = new UserPreferencesEntity();
      preferences.salesUpdateFrequency = frequency;
      preferences.wishlistUpdateFrequency = frequency;
      user.preferences = preferences;

      return;
    }

    user.preferences.salesUpdateFrequency = frequency;
    user.preferences.wishlistUpdateFrequency = frequency;
  }

  private parsePlatformLabel(text: string): Platform | null {
    const normalized = text.toLowerCase();

    if (normalized.includes('pc')) {
      return Platform.PC;
    }

    if (normalized.includes('mac')) {
      return Platform.MAC;
    }

    if (normalized.includes('steam deck')) {
      return Platform.STEAM_DECK;
    }

    return null;
  }

  private async validateRequest(request: BotRequest): Promise<{
    chatId: NonNullable<BotRequest['chatId']>;
    user: UserEntity;
    activeSubscription: SubscriptionEntity | null;
  } | null> {
    const chatId = request.chatId;

    if (!chatId) {
      return null;
    }

    const { user, activeSubscription } = await this.contextService.getSubscriptionContext(
      request.telegramUserId ?? undefined,
    );

    if (!user) {
      await this.sendReply(chatId, this.messages.startRequiredMessage());

      return null;
    }

    return { chatId, user, activeSubscription };
  }

  private parseSteamId(text: string): string | null {
    const trimmed = text.trim();

    return this.isValidSteamId(trimmed) ? trimmed : null;
  }

  private isValidSteamId(text: string): boolean {
    return /^\d{17}$/.test(text);
  }
}
