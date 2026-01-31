import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BOT_MESSENGER, type BotMessenger } from '../core/bot.types';
import {
  BOT_STEAM_SERVICE,
  BOT_USERS_SERVICE,
  BOT_WISHLIST_MESSAGE_BUILDER,
  type SteamServicePort,
  type UsersServicePort,
  type WishlistMessageBuilderPort,
} from 'src/modules/bot/ports/bot.ports';

const CRON_EVERY_3_DAYS_AT_7PM = '0 19 * * *';

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

  @Cron(CRON_EVERY_3_DAYS_AT_7PM)
  async handle(): Promise<void> {
    this.logger.log('Starting wishlist digest job');

    const usersWithSteamId = await this.usersService.getUsersWithSteamId();

    for (const user of usersWithSteamId) {
      try {
        const wishlistItems = await this.steamService.getWishlistItems(user.steamId!);

        const wishlistItemsOnSale = wishlistItems.filter((item) => !!item.discountPercent && item.discountPercent > 0);

        if (wishlistItemsOnSale.length === 0) {
          continue;
        }

        const mediaGroup = this.wishlistMessageBuilder.build(wishlistItemsOnSale, {
          intro: 'Ігри з вашого списку бажаного Steam на знижці: \n',
        });

        await this.messenger.sendMediaGroup(user.telegramId, mediaGroup);
      } catch (error) {
        this.logger.error(`Failed to fetch Steam wishlist for ${user.steamId}`, error);
        throw error;
      }
    }
  }
}
