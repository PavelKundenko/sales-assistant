import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BOT_STEAM_SERVICE,
  BOT_USERS_SERVICE,
  BOT_WISHLIST_MESSAGE_BUILDER,
  type SteamServicePort,
  type UsersServicePort,
  type WishlistMessageBuilderPort,
} from '../ports/bot.ports';
import { DigestJobRunner, type DigestConfig } from './digest-job.runner';

@Injectable()
export class WishlistDigestJob {
  private readonly logger = new Logger(WishlistDigestJob.name);

  private readonly digestConfig: DigestConfig = {
    jobName: 'wishlist digest',
    getLastReceivedAt: (prefs) => prefs.wishlistUpdateReceivedAt,
    getFrequency: (prefs) => prefs.wishlistUpdateFrequency,
    markSent: (service, userId) => service.updateWishlistReceivedAt(userId),
  };

  constructor(
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    @Inject(BOT_STEAM_SERVICE)
    private readonly steamService: SteamServicePort,
    @Inject(BOT_WISHLIST_MESSAGE_BUILDER)
    private readonly wishlistMessageBuilder: WishlistMessageBuilderPort,
    private readonly digestRunner: DigestJobRunner,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7PM)
  async handle(): Promise<void> {
    this.logger.log('Starting wishlist digest job');

    const usersWithSteamId = await this.usersService.getUsersWithSteamId();

    const recipients = usersWithSteamId.map((user) => ({
      user,
      telegramId: user.telegramId,
    }));

    await this.digestRunner.processRecipients(
      recipients,
      this.digestConfig,
      async (user) => {
        const wishlistItems = await this.steamService.getWishlistItems(user.steamId!);
        const wishlistItemsOnSale = wishlistItems.filter((item) => !!item.discountPercent && item.discountPercent > 0);

        if (wishlistItemsOnSale.length === 0) {
          return null;
        }

        return {
          messageSequence: this.wishlistMessageBuilder.build(wishlistItemsOnSale, {
            intro: 'Ігри з вашого списку бажаного Steam на знижці: \n',
          }),
        };
      },
      this.logger,
    );
  }
}
