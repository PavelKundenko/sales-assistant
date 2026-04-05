import { Inject, Injectable, Logger } from '@nestjs/common';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';
import {
  BOT_STEAM_SERVICE,
  BOT_USERS_SERVICE,
  BOT_WISHLIST_MESSAGE_BUILDER,
  type SteamServicePort,
  type UsersServicePort,
  type WishlistMessageBuilderPort,
} from '../../ports/bot.ports';
import type { SubscriptionEntity } from '../../../subscriptions/entities/subscription.entity';
import type { UserEntity } from '../../../users/entities/user.entity';

@Injectable()
export class BotWishlistService {
  private readonly logger = new Logger(BotWishlistService.name);

  constructor(
    @Inject(BOT_STEAM_SERVICE)
    private readonly steamService: SteamServicePort,
    @Inject(BOT_WISHLIST_MESSAGE_BUILDER)
    private readonly wishlistMessageBuilder: WishlistMessageBuilderPort,
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    private readonly messages: BotMessages,
    private readonly responder: BotResponder,
  ) {}

  async handleWishlistCommand(context: { chatId: NonNullable<BotRequest['chatId']>; user: UserEntity }): Promise<void> {
    if (!context.user.steamId) {
      await this.responder.sendReply(context.chatId, this.messages.steamIdGuideMessage());

      return;
    }

    await this.handleWishlist(context.chatId, context.user);
  }

  async handleConnectWishlistCommand(context: { chatId: NonNullable<BotRequest['chatId']>; user: UserEntity }) {
    if (context.user.steamId) {
      await this.responder.sendReply(context.chatId, this.messages.steamIdAlreadyConnectedMessage());

      return;
    }

    await this.responder.sendReply(context.chatId, this.messages.steamIdGuideMessage());
  }

  async handleSetupWishlistCommand(
    request: BotRequest,
    context: {
      chatId: NonNullable<BotRequest['chatId']>;
      user: UserEntity;
      activeSubscription: SubscriptionEntity | null;
    },
  ): Promise<void> {
    const text = request.text;
    const args = text?.split(' ') ?? [];

    const potentialSteamId = args.length > 1 ? args[1] : null;

    if (!potentialSteamId) {
      await this.responder.sendReply(context.chatId, this.messages.steamIdGuideMessage());

      return;
    }

    if (!this.isValidSteamId(potentialSteamId)) {
      await this.responder.sendReply(context.chatId, this.messages.steamIdGuideMessage());

      return;
    }

    await this.handleSteamIdSetup(context.chatId, context.user, potentialSteamId, Boolean(context.activeSubscription));
  }

  async tryHandleSteamIdFromText(
    text: string,
    context: {
      chatId: NonNullable<BotRequest['chatId']>;
      user: UserEntity;
      activeSubscription: SubscriptionEntity | null;
    },
  ): Promise<boolean> {
    const steamId = this.parseSteamId(text);

    if (!steamId) {
      return false;
    }

    await this.handleSteamIdSetup(context.chatId, context.user, steamId, Boolean(context.activeSubscription));

    return true;
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

      await this.responder.sendReply(chatId, this.messages.steamIdConnectedMessage(isSubscribed));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to connect Steam ID for user ${user.telegramId}: ${reason}`);
      await this.responder.sendReply(chatId, this.messages.steamIdNotFoundMessage());
    }
  }

  private async handleWishlist(chatId: NonNullable<BotRequest['chatId']>, user: UserEntity): Promise<void> {
    const steamId = user.steamId!;
    await this.responder.sendReply(chatId, this.messages.wishlistLoadingMessage());

    try {
      const items = await this.steamService.getWishlistItems(steamId);

      if (items.length === 0) {
        await this.responder.sendReply(chatId, this.messages.wishlistEmptyMessage());

        return;
      }

      const messageSequence = this.wishlistMessageBuilder.build(items, {
        intro: '📋 Ваш список бажаного:\n',
      });

      await this.responder.sendMessageSequence(chatId, messageSequence);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const trace = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to load wishlist for chat ${chatId}: ${reason}`, trace);

      await this.responder.sendReply(chatId, this.messages.wishlistErrorMessage());
    }
  }

  private parseSteamId(text: string): string | null {
    const trimmed = text.trim();

    return this.isValidSteamId(trimmed) ? trimmed : null;
  }

  private isValidSteamId(text: string): boolean {
    return /^\d{17}$/.test(text);
  }
}
