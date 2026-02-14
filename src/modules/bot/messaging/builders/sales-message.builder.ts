import { Injectable } from '@nestjs/common';
import { SteamSaleDto } from '../../../steam/dto/steam-sale.dto';
import type { BotMessageSequence } from '../../core/bot.types';
import { SteamMessageBuilder, type SteamMessageBuilderOptions } from './steam-message.builder';

type SalesMessageBuilderOptions = SteamMessageBuilderOptions & { limit?: number };

@Injectable()
export class SalesMessageBuilder extends SteamMessageBuilder<SteamSaleDto[], BotMessageSequence> {
  build(sales: SteamSaleDto[], options: SalesMessageBuilderOptions = {}): BotMessageSequence {
    if (sales.length === 0) {
      throw new Error('Sales collection is empty');
    }

    const limit = options.limit ?? 10;
    const topSales = sales.slice(0, limit);

    const salesWithImages = topSales
      .map((game) => ({ game, imageUrl: this.sanitizeUrl(game.headerImage) }))
      .filter((entry): entry is { game: SteamSaleDto; imageUrl: string } => Boolean(entry.imageUrl));

    if (salesWithImages.length === 0) {
      throw new Error('No valid sales images available');
    }
    const captionLines: string[] = [];

    if (options.intro) {
      captionLines.push(options.intro);
    }

    for (const { game } of salesWithImages) {
      const name = this.escapeHtml(game.name ?? 'Невідома назва');

      const discountPercent =
        game.discountPercent !== undefined && game.discountPercent !== null ? `${game.discountPercent}%` : 'Н/Д';

      const originalPrice = this.formatPrice(game.originalPrice);
      const finalPrice = this.formatPrice(game.finalPrice);
      const platformsLine = this.formatPlatforms(game);

      const storeUrl = this.sanitizeUrl(game.storeUrl);
      const title = storeUrl ? `<a href="${this.escapeHtml(storeUrl)}">${name}</a>` : name;

      captionLines.push(
        title,
        `💰 Знижка ${discountPercent}`,
        `Ціна: <s>${originalPrice}</s> ${finalPrice}`,
        platformsLine,
      );

      if (game.expiryDate) {
        const date = game.expiryDate.toLocaleDateString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
        });
        captionLines.push(`⏳ До: ${date}`);
      }

      captionLines.push('');
    }

    const mediaGroup = salesWithImages.map(({ imageUrl }) => ({
      type: 'photo' as const,
      media: imageUrl,
    }));

    const text = captionLines.join('\n').trim();

    return [
      { type: 'mediaGroup', media: mediaGroup },
      { type: 'text', text, options: { parseMode: 'HTML' } },
    ];
  }
}
