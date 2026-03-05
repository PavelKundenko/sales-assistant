import { Injectable } from '@nestjs/common';
import { SteamWishlistItemDto } from '../../../steam/dto/steam-wishlist-item.dto';
import type { BotMessageSequence } from '../../core/bot.types';
import { SteamMessageBuilder, type SteamMessageBuilderOptions } from './steam-message.builder';

@Injectable()
export class WishlistMessageBuilder extends SteamMessageBuilder<SteamWishlistItemDto[], BotMessageSequence> {
  build(items: SteamWishlistItemDto[], options?: SteamMessageBuilderOptions): BotMessageSequence {
    if (items.length === 0) {
      throw new Error('Wishlist collection is empty');
    }

    const allItemsWithImages = items
      .map((game) => ({ game, imageUrl: this.sanitizeUrl(game.headerImage) }))
      .filter((entry): entry is { game: SteamWishlistItemDto; imageUrl: string } => Boolean(entry.imageUrl));

    if (allItemsWithImages.length === 0) {
      throw new Error('No valid wishlist images available');
    }

    const lines: string[] = [];

    if (options?.intro) {
      lines.push(options.intro);
    }

    for (const { game } of allItemsWithImages) {
      const name = this.escapeHtml(game.name ?? 'Невідома назва');
      const storeUrl = this.sanitizeUrl(game.storeUrl);
      const title = storeUrl ? `<a href="${this.escapeHtml(storeUrl)}">${name}</a>` : name;

      const originalPrice = this.formatPrice(game.originalPrice);
      const finalPrice = this.formatPrice(game.finalPrice);
      const platformsLine = this.formatPlatforms(game);

      const hasDiscount = typeof game.discountPercent === 'number' && game.discountPercent > 0;

      if (hasDiscount) {
        lines.push(
          title,
          `💰 Знижка ${game.discountPercent}%`,
          `Ціна: <s>${originalPrice}</s> ${finalPrice}`,
          platformsLine,
        );

        if (game.expiryDate) {
          const date = game.expiryDate.toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
          });
          lines.push(`⏳ До: ${date}`);
        }

        lines.push('');
      } else {
        lines.push(title, `Ціна: ${finalPrice}`, platformsLine, '');
      }
    }

    const text = lines.join('\n').trim();

    const mediaGroup = allItemsWithImages.slice(0, 10).map(({ imageUrl }) => ({
      type: 'photo' as const,
      media: imageUrl,
    }));

    return [
      { type: 'mediaGroup', media: mediaGroup },
      { type: 'text', text, options: { parseMode: 'HTML' } },
    ];
  }
}
