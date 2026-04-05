import { Injectable } from '@nestjs/common';
import {
  CONNECT_WISHLIST_BUTTON_LABEL,
  SALES_BUTTON_LABEL,
  SETTINGS_BUTTON_LABEL,
  START_BUTTON_LABEL,
  SUBSCRIBE_BUTTON_LABEL,
  UNSUBSCRIBE_BUTTON_LABEL,
  WISHLIST_BUTTON_LABEL,
} from '../core/bot.constants';
import type { BotRequest } from '../core/bot.types';
import { BotService } from '../core/bot.service';

type RouteHandler = (request: BotRequest) => Promise<void>;

@Injectable()
export class BotTextRouter {
  private readonly routes: ReadonlyMap<string, RouteHandler>;

  constructor(private readonly botService: BotService) {
    this.routes = new Map<string, RouteHandler>([
      [START_BUTTON_LABEL, (req) => this.botService.handleStart(req)],
      [SETTINGS_BUTTON_LABEL, (req) => this.botService.handleSettingsCommand(req)],
      [SALES_BUTTON_LABEL, (req) => this.botService.handleSalesCommand(req)],
      [SUBSCRIBE_BUTTON_LABEL, (req) => this.botService.handleSubscribeCommand(req)],
      [UNSUBSCRIBE_BUTTON_LABEL, (req) => this.botService.handleUnsubscribeCommand(req)],
      [WISHLIST_BUTTON_LABEL, (req) => this.botService.handleWishlistCommand(req)],
      [CONNECT_WISHLIST_BUTTON_LABEL, (req) => this.botService.handleConnectWishlistCommand(req)],
    ]);
  }

  async handleText(request: BotRequest): Promise<void> {
    if (!request.text || !request.chatId) {
      return;
    }

    const handler = this.routes.get(request.text);

    if (handler) {
      await handler(request);
      return;
    }

    if (request.text.startsWith('/post')) {
      await this.botService.handlePostCommand(request);
      return;
    }

    await this.botService.handleTextCommand(request);
  }
}
