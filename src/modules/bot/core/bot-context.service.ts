import { Inject, Injectable } from '@nestjs/common';
import {
  BOT_SUBSCRIPTIONS_SERVICE,
  BOT_USERS_SERVICE,
  type SubscriptionsServicePort,
  type UsersServicePort,
} from '../ports/bot.ports';
import { UserEntity } from '../../users/entities/user.entity';
import { SubscriptionEntity, SubscriptionType } from '../../subscriptions/entities/subscription.entity';

@Injectable()
export class BotContextService {
  constructor(
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    @Inject(BOT_SUBSCRIPTIONS_SERVICE)
    private readonly subscriptionsService: SubscriptionsServicePort,
  ) {}

  async getSubscriptionContext(
    telegramId?: number,
  ): Promise<{ user: UserEntity | null; activeSubscription: SubscriptionEntity | null }> {
    if (!telegramId) {
      return { user: null, activeSubscription: null };
    }

    const user = await this.usersService.findByTelegramId(telegramId.toString());

    if (!user) {
      return { user: null, activeSubscription: null };
    }

    const activeSubscriptions = await this.subscriptionsService.findActiveByUser(user.id);
    const activeSubscription =
      activeSubscriptions.find((subscription) => subscription.type === SubscriptionType.STEAM) ?? null;

    return { user, activeSubscription };
  }
}
