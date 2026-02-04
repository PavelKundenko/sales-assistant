import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BOT_MESSENGER, type BotMessenger } from '../core/bot.types';
import {
  BOT_STEAM_SERVICE,
  BOT_USERS_SERVICE,
  BOT_WISHLIST_MESSAGE_BUILDER,
  type SteamServicePort,
  type UsersServicePort,
  type WishlistMessageBuilderPort,
} from 'src/modules/bot/ports/bot.ports';
import { shouldSendUpdate } from '../../steam/utils/platform-filter.util';

@Injectable()
export class WishlistDigestJob {
  private readonly logger = new Logger(WishlistDigestJob.name);

  constructor(
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    @Inject(BOT_STEAM_SERVICE)
    private readonly steamService: SteamServicePort,
    @Inject(BOT_WISHLIST_MESSAGE_BUILDER)
    private readonly wishlistMessageBuilder: WishlistMessageBuilderPort,
    @Inject(BOT_MESSENGER)
    private readonly messenger: BotMessenger,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7PM)
  async handle(): Promise<void> {
    this.logger.log('Starting wishlist digest job');

    const usersWithSteamId = await this.usersService.getUsersWithSteamId();

    for (const user of usersWithSteamId) {
      try {
        const preferences = user.preferences;

        if (!preferences) {
          this.logger.warn(`User ${user.id} has no preferences, skipping`);
          continue;
        }

        const shouldSend = shouldSendUpdate(preferences.wishlistUpdateReceivedAt, preferences.wishlistUpdateFrequency);

        if (!shouldSend) {
          this.logger.debug(`Skipping wishlist digest for user ${user.id} - frequency not met`);
          continue;
        }

        const wishlistItems = await this.steamService.getWishlistItems(user.steamId!);

        const wishlistItemsOnSale = wishlistItems.filter((item) => !!item.discountPercent && item.discountPercent > 0);

        if (wishlistItemsOnSale.length === 0) {
          continue;
        }

        const messageSequence = this.wishlistMessageBuilder.build(wishlistItemsOnSale, {
          intro: 'Ігри з вашого списку бажаного Steam на знижці: \n',
        });

        await this.messenger.sendMessageSequence(user.telegramId, messageSequence);
        await this.usersService.updateWishlistReceivedAt(user.id);

        this.logger.log(`Sent wishlist digest to user ${user.id}`);
      } catch (error) {
        this.logger.error(`Failed to fetch Steam wishlist for ${user.steamId}`, error);
      }
    }
  }
}
