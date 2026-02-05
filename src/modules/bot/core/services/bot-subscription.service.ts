import { Inject, Injectable } from '@nestjs/common';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import { BOT_SUBSCRIPTIONS_SERVICE, type SubscriptionsServicePort } from '../../ports/bot.ports';
import type { BotRequest } from '../bot.types';
import type { SubscriptionEntity } from '../../../subscriptions/entities/subscription.entity';
import type { UserEntity } from '../../../users/entities/user.entity';
import { SubscriptionType } from '../../../subscriptions/entities/subscription.entity';

@Injectable()
export class BotSubscriptionService {
  constructor(
    @Inject(BOT_SUBSCRIPTIONS_SERVICE)
    private readonly subscriptionsService: SubscriptionsServicePort,
    private readonly messages: BotMessages,
    private readonly responder: BotResponder,
  ) {}

  async subscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    user: UserEntity,
    activeSubscription: SubscriptionEntity | null,
  ): Promise<void> {
    if (!activeSubscription) {
      await this.subscriptionsService.createForUser(user, SubscriptionType.STEAM);
    }

    await this.responder.sendReply(chatId, this.messages.subscribeMessage(Boolean(user.steamId)));
  }

  async unsubscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    activeSubscription: SubscriptionEntity | null,
    hasSteamId: boolean,
  ): Promise<void> {
    if (activeSubscription) {
      await this.subscriptionsService.deactivate(activeSubscription.id);
    }

    await this.responder.sendReply(chatId, this.messages.unsubscribeMessage(hasSteamId));
  }
}
