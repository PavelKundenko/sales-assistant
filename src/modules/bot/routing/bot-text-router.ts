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
import { BotService } from '../core/bot.service';

@Injectable()
export class BotTextRouter {
  constructor(private readonly botService: BotService) {}

  async handleText(request: BotRequest): Promise<void> {
    if (!request.text) {
      return;
    }

    const chatId = request.chatId;

    if (!chatId) {
      return;
    }

    const text = request.text;

    if (text === START_BUTTON_LABEL) {
      await this.botService.handleStart(request);

      return;
    }

    if (text === SALES_BUTTON_LABEL) {
      await this.botService.handleSalesCommand(request);

      return;
    }

    if (text === SUBSCRIBE_BUTTON_LABEL) {
      await this.botService.handleSubscribeCommand(request);

      return;
    }

    if (text === UNSUBSCRIBE_BUTTON_LABEL) {
      await this.botService.handleUnsubscribeCommand(request);

      return;
    }

    if (text === WISHLIST_BUTTON_LABEL) {
      await this.botService.handleWishlistCommand(request);

      return;
    }

    if (text === CONNECT_WISHLIST_BUTTON_LABEL) {
      await this.botService.handleConnectWishlistCommand(request);

      return;
    }

    await this.botService.handleTextCommand(request);
  }
}
