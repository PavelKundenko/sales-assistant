import { Inject, Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

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
    private readonly contextService: BotContextService,
    private readonly messages: BotMessages,
  ) {}

  async handleStart(request: BotRequest): Promise<void> {
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
    const chatId = request.chatId;
    const telegramId = request.telegramUserId;

    if (!chatId) {
      return;
    }

    await this.sendReply(chatId, this.messages.salesLoadingMessage());

    try {
      const sales = await this.steamService.getCurrentSales();

      if (sales.length === 0) {
        await this.sendReply(chatId, this.messages.salesEmptyMessage());

        return;
      }

      const mediaGroup = this.salesMessageBuilder.build(sales, {
        intro: '🔥 Актуальні знижки у Steam:\n',
      });

      await this.messenger.sendMediaGroup(chatId, mediaGroup);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const trace = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to handle /sales for ${telegramId ?? 'unknown'}: ${reason}`, trace);

      await this.sendReply(chatId, this.messages.salesErrorMessage());
    }
  }

  async handleHelp(request: BotRequest): Promise<void> {
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

  async handleWishlist(chatId: NonNullable<BotRequest['chatId']>, steamId: string): Promise<void> {
    await this.sendReply(chatId, this.messages.wishlistLoadingMessage());

    try {
      const items = await this.steamService.getWishlistItems(steamId);

      if (items.length === 0) {
        await this.sendReply(chatId, this.messages.wishlistEmptyMessage());

        return;
      }

      const mediaGroup = this.wishlistMessageBuilder.build(items, {
        intro: '📋 Ваш список бажаного:\n',
      });

      await this.messenger.sendMediaGroup(chatId, mediaGroup);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const trace = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to load wishlist for chat ${chatId}: ${reason}`, trace);

      await this.sendReply(chatId, this.messages.wishlistErrorMessage());
    }
  }

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

  async sendSteamIdGuide(chatId: NonNullable<BotRequest['chatId']>): Promise<void> {
    await this.sendReply(chatId, this.messages.steamIdGuideMessage());
  }

  async sendSteamIdAlreadyConnected(chatId: NonNullable<BotRequest['chatId']>): Promise<void> {
    await this.sendReply(chatId, this.messages.steamIdAlreadyConnectedMessage());
  }

  async sendStartRequired(chatId: NonNullable<BotRequest['chatId']>): Promise<void> {
    await this.sendReply(chatId, this.messages.startRequiredMessage());
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
}
