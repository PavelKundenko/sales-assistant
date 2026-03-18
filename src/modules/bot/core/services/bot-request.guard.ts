import { Inject, Injectable } from '@nestjs/common';
import { BotContextService } from '../bot-context.service';
import { BOT_USERS_SERVICE, type UsersServicePort } from '../../ports/bot.ports';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';
import type { SubscriptionEntity } from '../../../subscriptions/entities/subscription.entity';
import type { UserEntity } from '../../../users/entities/user.entity';

export type GuardedContext = {
  chatId: NonNullable<BotRequest['chatId']>;
  user: UserEntity;
  activeSubscription: SubscriptionEntity | null;
};

@Injectable()
export class BotRequestGuard {
  constructor(
    private readonly contextService: BotContextService,
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    private readonly messages: BotMessages,
    private readonly responder: BotResponder,
  ) {}

  async requireContext(request: BotRequest): Promise<GuardedContext | null> {
    const chatId = request.chatId;

    if (!chatId) {
      return null;
    }

    const { user, activeSubscription } = await this.contextService.getSubscriptionContext(
      request.telegramUserId ?? undefined,
    );

    if (!user) {
      await this.responder.sendReply(chatId, this.messages.startRequiredMessage());
      return null;
    }

    if (request.telegramUsername && user.telegramUsername !== request.telegramUsername) {
      await this.usersService.updateTelegramUsername(user.id, request.telegramUsername);
      user.telegramUsername = request.telegramUsername;
    }

    return { chatId, user, activeSubscription };
  }
}
