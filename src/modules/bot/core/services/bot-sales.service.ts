import { Inject, Injectable, Logger } from '@nestjs/common';
import { BotContextService } from '../bot-context.service';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';
import {
  BOT_SALES_MESSAGE_BUILDER,
  BOT_STEAM_SERVICE,
  type SalesMessageBuilderPort,
  type SteamServicePort,
} from '../../ports/bot.ports';
import { filterByPlatform } from '../../../steam/utils/platform-filter.util';

@Injectable()
export class BotSalesService {
  private readonly logger = new Logger(BotSalesService.name);

  constructor(
    private readonly contextService: BotContextService,
    @Inject(BOT_STEAM_SERVICE)
    private readonly steamService: SteamServicePort,
    @Inject(BOT_SALES_MESSAGE_BUILDER)
    private readonly salesMessageBuilder: SalesMessageBuilderPort,
    private readonly messages: BotMessages,
    private readonly responder: BotResponder,
  ) {}

  async handleSalesCommand(request: BotRequest): Promise<void> {
    const chatId = request.chatId;
    const telegramId = request.telegramUserId;

    if (!chatId) {
      return;
    }

    await this.responder.sendReply(chatId, this.messages.salesLoadingMessage());

    try {
      const { user } = await this.contextService.getSubscriptionContext(telegramId ?? undefined);

      const sales = await this.steamService.getCurrentSales();

      if (sales.length === 0) {
        await this.responder.sendReply(chatId, this.messages.salesEmptyMessage());

        return;
      }

      const platforms = user?.preferences?.platform ?? [];

      const filteredSales = filterByPlatform(sales, platforms);

      if (filteredSales.length === 0) {
        await this.responder.sendReply(chatId, this.messages.salesEmptyMessage());

        return;
      }

      const messageSequence = this.salesMessageBuilder.build(filteredSales, {
        intro: '🔥 Актуальні знижки у Steam:\n',
      });

      await this.responder.sendMessageSequence(chatId, messageSequence);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const trace = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to handle /sales for ${telegramId ?? 'unknown'}: ${reason}`, trace);

      await this.responder.sendReply(chatId, this.messages.salesErrorMessage());
    }
  }
}
