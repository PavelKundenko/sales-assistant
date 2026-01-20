import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { SteamService } from '../steam/steam.service';
import { SalesMessageBuilder } from './sales-message.builder';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionType } from '../subscriptions/entities/subscription.entity';

@Injectable()
export class SalesDigestJob {
  private readonly logger = new Logger(SalesDigestJob.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly steamService: SteamService,
    private readonly salesMessageBuilder: SalesMessageBuilder,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1PM)
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

      const { caption, photoUrl } = this.salesMessageBuilder.buildTopSalesMessage(sales);

      for (const subscription of subscriptions) {
        const telegramId = subscription.user.telegramId;

        try {
          await this.bot.telegram.sendPhoto(telegramId, photoUrl, {
            caption,
            parse_mode: 'HTML',
          });
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
