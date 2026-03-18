import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionType } from '../../subscriptions/entities/subscription.entity';
import {
  BOT_SALES_MESSAGE_BUILDER,
  BOT_STEAM_SERVICE,
  BOT_SUBSCRIPTIONS_SERVICE,
  type SalesMessageBuilderPort,
  type SteamServicePort,
  type SubscriptionsServicePort,
} from '../ports/bot.ports';
import { filterByPlatform } from '../../steam/utils/platform-filter.util';
import { Platform } from '../../../shared/enums/platform.enum';
import { DigestJobRunner, type DigestConfig } from './digest-job.runner';

@Injectable()
export class SalesDigestJob {
  private readonly logger = new Logger(SalesDigestJob.name);

  private readonly digestConfig: DigestConfig = {
    jobName: 'sales digest',
    getLastReceivedAt: (prefs) => prefs.salesUpdateReceivedAt,
    getFrequency: (prefs) => prefs.salesUpdateFrequency,
    markSent: (service, userId) => service.updateSalesReceivedAt(userId),
  };

  constructor(
    @Inject(BOT_SUBSCRIPTIONS_SERVICE)
    private readonly subscriptionsService: SubscriptionsServicePort,
    @Inject(BOT_STEAM_SERVICE)
    private readonly steamService: SteamServicePort,
    @Inject(BOT_SALES_MESSAGE_BUILDER)
    private readonly salesMessageBuilder: SalesMessageBuilderPort,
    private readonly digestRunner: DigestJobRunner,
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

      const recipients = subscriptions.map((sub) => ({
        user: sub.user,
        telegramId: sub.user.telegramId,
      }));

      await this.digestRunner.processRecipients(
        recipients,
        this.digestConfig,
        (user) => {
          const userPlatforms = user.preferences?.platform || [Platform.PC, Platform.MAC, Platform.STEAM_DECK];
          const filteredSales = filterByPlatform(sales, userPlatforms);

          if (filteredSales.length === 0) {
            this.logger.debug(`No sales matching platforms for user ${user.id}`);
            return null;
          }

          return {
            messageSequence: this.salesMessageBuilder.build(filteredSales, {
              intro: `🔥 Актуальні знижки у Steam на ${new Date().toLocaleDateString()}:\n`,
            }),
          };
        },
        this.logger,
      );
    } catch (error) {
      const trace = error instanceof Error ? error.stack : undefined;
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sales digest job failed: ${reason}`, trace);
    }
  }
}
