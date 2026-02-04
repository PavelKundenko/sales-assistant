import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionType } from '../../subscriptions/entities/subscription.entity';
import { BOT_MESSENGER, type BotMessenger } from '../core/bot.types';
import {
  BOT_SALES_MESSAGE_BUILDER,
  BOT_STEAM_SERVICE,
  BOT_SUBSCRIPTIONS_SERVICE,
  BOT_USERS_SERVICE,
  type SalesMessageBuilderPort,
  type SteamServicePort,
  type SubscriptionsServicePort,
  type UsersServicePort,
} from '../ports/bot.ports';
import { filterByPlatform, shouldSendUpdate } from '../../steam/utils/platform-filter.util';
import { Platform } from '../../users/entities/user-preferences.entity';

@Injectable()
export class SalesDigestJob {
  private readonly logger = new Logger(SalesDigestJob.name);

  constructor(
    @Inject(BOT_SUBSCRIPTIONS_SERVICE)
    private readonly subscriptionsService: SubscriptionsServicePort,
    @Inject(BOT_STEAM_SERVICE)
    private readonly steamService: SteamServicePort,
    @Inject(BOT_SALES_MESSAGE_BUILDER)
    private readonly salesMessageBuilder: SalesMessageBuilderPort,
    @Inject(BOT_MESSENGER)
    private readonly messenger: BotMessenger,
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async sendDailySalesDigest(): Promise<void> {
    try {
      const subscriptions = await this.subscriptionsService.findActiveByType(SubscriptionType.STEAM);

      if (subscriptions.length === 0) {
        this.logger.log('No active Steam subscriptions found for daily digest');
        return;
      }

      const sales = await this.steamService.getCurrentSales();

      if (sales.length === 0) {
        this.logger.log('No sales available for daily digest');

        return;
      }

      for (const subscription of subscriptions) {
        const telegramId = subscription.user.telegramId;
        const user = subscription.user;

        try {
          const preferences = user.preferences;

          if (!preferences) {
            this.logger.warn(`User ${user.id} has no preferences, skipping`);
            continue;
          }

          const shouldSend = shouldSendUpdate(preferences.salesUpdateReceivedAt, preferences.salesUpdateFrequency);

          if (!shouldSend) {
            this.logger.debug(`Skipping sales digest for user ${user.id} - frequency not met`);
            continue;
          }

          const userPlatforms = preferences.platform || [Platform.PC, Platform.MAC, Platform.STEAM_DECK];

          const filteredSales = filterByPlatform(sales, userPlatforms);

          if (filteredSales.length === 0) {
            this.logger.debug(`No sales matching platforms for user ${user.id}`);
            continue;
          }

          const mediaGroup = this.salesMessageBuilder.build(filteredSales, {
            intro: `🔥 Актуальні знижки у Steam на ${new Date().toLocaleDateString()}:\n`,
          });

          await this.messenger.sendMediaGroup(telegramId, mediaGroup);
          await this.usersService.updateSalesReceivedAt(user.id);

          this.logger.log(`Sent sales digest to user ${user.id}`);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to send sales digest to user ${telegramId}: ${reason}`);
        }
      }
    } catch (error) {
      const trace = error instanceof Error ? error.stack : undefined;
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sales digest job failed: ${reason}`, trace);
    }
  }
}
