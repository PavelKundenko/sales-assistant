import { Injectable } from '@nestjs/common';
import { BotContextService } from '../bot-context.service';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';

@Injectable()
export class BotHelpService {
  constructor(
    private readonly contextService: BotContextService,
    private readonly messages: BotMessages,
    private readonly responder: BotResponder,
  ) {}

  async handleHelp(request: BotRequest): Promise<void> {
    const chatId = request.chatId;

    if (!chatId) {
      return;
    }

    const { user, activeSubscription } = await this.contextService.getSubscriptionContext(
      request.telegramUserId ?? undefined,
    );

    const reply = this.messages.helpMessage(Boolean(activeSubscription), Boolean(user?.steamId));

    await this.responder.sendReply(chatId, reply);
  }
}
