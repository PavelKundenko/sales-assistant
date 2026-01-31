import { Injectable } from '@nestjs/common';
import {
  CONNECT_WISHLIST_BUTTON_LABEL,
  SALES_BUTTON_LABEL,
  START_BUTTON_LABEL,
  SUBSCRIBE_BUTTON_LABEL,
  UNSUBSCRIBE_BUTTON_LABEL,
  WISHLIST_BUTTON_LABEL,
} from '../core/bot.constants';
import type { BotRequest } from '../core/bot.types';
import { BotContextService } from '../core/bot-context.service';
import { BotService } from '../core/bot.service';

@Injectable()
export class BotTextRouter {
  constructor(
    private readonly botService: BotService,
    private readonly contextService: BotContextService,
  ) {}

  async handleText(request: BotRequest): Promise<void> {
    if (!request.text) {
      return;
    }

    const chatId = request.chatId;

    if (!chatId) {
      return;
    }

    const telegramId = request.telegramUserId;
    const text = request.text;

    if (text === START_BUTTON_LABEL) {
      await this.botService.handleStart(request);

      return;
    }

    if (text === SALES_BUTTON_LABEL) {
      await this.botService.handleSalesCommand(request);

      return;
    }

    const { user, activeSubscription } = await this.contextService.getSubscriptionContext(telegramId ?? undefined);

    if (!user) {
      await this.botService.sendStartRequired(chatId);

      return;
    }

    if (text === SUBSCRIBE_BUTTON_LABEL) {
      await this.botService.handleSubscribe(chatId, user, activeSubscription);

      return;
    }

    if (text === UNSUBSCRIBE_BUTTON_LABEL) {
      await this.botService.handleUnsubscribe(chatId, activeSubscription, Boolean(user.steamId));

      return;
    }

    if (text === WISHLIST_BUTTON_LABEL) {
      if (!user.steamId) {
        await this.botService.sendSteamIdGuide(chatId);

        return;
      }

      await this.botService.handleWishlist(chatId, user.steamId);

      return;
    }

    if (text === CONNECT_WISHLIST_BUTTON_LABEL) {
      if (user.steamId) {
        await this.botService.sendSteamIdAlreadyConnected(chatId);

        return;
      }

      await this.botService.sendSteamIdGuide(chatId);

      return;
    }

    if (!user.steamId) {
      const steamId = this.parseSteamId(text);

      if (steamId) {
        await this.botService.handleSteamIdSetup(chatId, user, steamId, Boolean(activeSubscription));

        return;
      }
    }

    await this.botService.sendUnknownText(chatId, Boolean(activeSubscription), Boolean(user.steamId));
  }

  private parseSteamId(text: string): string | null {
    const trimmed = text.trim();

    return /^\d{17}$/.test(trimmed) ? trimmed : null;
  }
}
