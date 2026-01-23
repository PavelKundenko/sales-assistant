import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SteamService } from '../steam/steam.service';
import { SalesMessageBuilder } from './sales-message.builder';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionType } from '../subscriptions/entities/subscription.entity';
import { BOT_MESSENGER, type BotMessenger } from './bot.types';

@Injectable()
export class SalesDigestJob {
  private readonly logger = new Logger(SalesDigestJob.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly steamService: SteamService,
    private readonly salesMessageBuilder: SalesMessageBuilder,
    @Inject(BOT_MESSENGER)
    private readonly messenger: BotMessenger,
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

      const mediaGroup = this.salesMessageBuilder.buildTopSalesMessage(sales);

      for (const subscription of subscriptions) {
        const telegramId = subscription.user.telegramId;

        try {
          await this.messenger.sendMediaGroup(telegramId, mediaGroup);
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
