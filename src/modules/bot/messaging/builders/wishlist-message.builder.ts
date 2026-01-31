import { Injectable } from '@nestjs/common';
import { SteamWishlistItemDto } from '../../../steam/dto/steam-wishlist-item.dto';
import type { BotMediaItem } from '../../core/bot.types';
import { SteamMessageBuilder, type SteamMessageBuilderOptions } from './steam-message.builder';

export type WishlistMediaGroup = BotMediaItem[];

@Injectable()
export class WishlistMessageBuilder extends SteamMessageBuilder<SteamWishlistItemDto[], WishlistMediaGroup> {
  build(items: SteamWishlistItemDto[], options?: SteamMessageBuilderOptions): WishlistMediaGroup {
    if (items.length === 0) {
      throw new Error('Wishlist collection is empty');
    }

    const topItems = items.slice(0, 9);

    const itemsWithImages = topItems
      .map((game) => ({ game, imageUrl: this.sanitizeUrl(game.headerImage) }))
      .filter((entry): entry is { game: SteamWishlistItemDto; imageUrl: string } => Boolean(entry.imageUrl));

    if (itemsWithImages.length === 0) {
      throw new Error('No valid wishlist images available');
    }

    const lines: string[] = [];

    if (options?.intro) {
      lines.push(options.intro);
    }

    for (const game of items) {
      const name = this.escapeHtml(game.name ?? 'Невідома назва');
      const storeUrl = this.sanitizeUrl(game.storeUrl);
      const title = storeUrl ? `<a href="${this.escapeHtml(storeUrl)}">${name}</a>` : name;

      const originalPrice = this.formatPrice(game.originalPrice);
      const finalPrice = this.formatPrice(game.finalPrice);

      const hasDiscount = typeof game.discountPercent === 'number' && game.discountPercent > 0;

      if (hasDiscount) {
        lines.push(title, `💰 Знижка ${game.discountPercent}%`, `Ціна: <s>${originalPrice}</s> ${finalPrice}`, '');
      } else {
        lines.push(title, `Ціна: ${finalPrice}`, '');
      }
    }

    const caption = lines.join('\n').trim();

    return itemsWithImages.map(({ imageUrl }, index): BotMediaItem => {
      const mediaItem: BotMediaItem = {
        type: 'photo',
        media: imageUrl,
      };

      if (index === 0) {
        mediaItem.caption = caption;
        mediaItem.parseMode = 'HTML';
      }

      return mediaItem;
    });
  }
}
