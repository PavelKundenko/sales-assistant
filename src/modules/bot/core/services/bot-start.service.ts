import { Inject, Injectable } from '@nestjs/common';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import {
  BOT_SUBSCRIPTIONS_SERVICE,
  BOT_USERS_SERVICE,
  type SubscriptionsServicePort,
  type UsersServicePort,
} from '../../ports/bot.ports';
import type { BotRequest } from '../bot.types';
import { SubscriptionType } from '../../../subscriptions/entities/subscription.entity';

@Injectable()
export class BotStartService {
  constructor(
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    @Inject(BOT_SUBSCRIPTIONS_SERVICE)
    private readonly subscriptionsService: SubscriptionsServicePort,
    private readonly messages: BotMessages,
    private readonly responder: BotResponder,
  ) {}

  async handleStart(request: BotRequest): Promise<void> {
    const telegramId = request.telegramUserId;
    const chatId = request.chatId;

    if (!telegramId || !chatId) {
      return;
    }

    const [user, created] = await this.usersService.createOrGet(
      telegramId.toString(),
      request.telegramUsername ?? null,
    );

    const activeSubscriptions = await this.subscriptionsService.findActiveByUser(user.id);

    const isSubscribed = activeSubscriptions.some((subscription) => subscription.type === SubscriptionType.STEAM);

    const reply = this.messages.startMessage(created, isSubscribed, Boolean(user.steamId));

    await this.responder.sendReply(chatId, reply);
  }
}
