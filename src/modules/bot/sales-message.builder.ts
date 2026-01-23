import { Injectable } from '@nestjs/common';
import { SteamSaleDto } from '../steam/dto/steam-sale.dto';
import type { BotMediaItem } from './bot.types';

export type SalesMediaGroup = BotMediaItem[];

@Injectable()
export class SalesMessageBuilder {
  buildTopSalesMessage(sales: SteamSaleDto[], limit = 10): SalesMediaGroup {
    if (sales.length === 0) {
      throw new Error('Sales collection is empty');
    }

    const topSales = sales.slice(0, limit);

    const salesWithImages = topSales
      .map((game) => ({ game, imageUrl: this.sanitizeUrl(game.headerImage) }))
      .filter((entry): entry is { game: SteamSaleDto; imageUrl: string } => Boolean(entry.imageUrl));

    if (salesWithImages.length === 0) {
      throw new Error('No valid sales images available');
    }
    const captionLines = ['🔥 Актуальні знижки у Steam:\n'];

    for (const { game } of salesWithImages) {
      const name = this.escapeHtml(game.name ?? 'Невідома назва');

      const discountPercent =
        game.discountPercent !== undefined && game.discountPercent !== null ? `${game.discountPercent}%` : 'Н/Д';

      const originalPrice = this.formatPrice(game.originalPrice);
      const finalPrice = this.formatPrice(game.finalPrice);

      const storeUrl = this.sanitizeUrl(game.storeUrl);
      const title = storeUrl ? `<a href="${this.escapeHtml(storeUrl)}">${name}</a>` : name;

      captionLines.push(title, `💰 Знижка ${discountPercent}`, `Ціна: <s>${originalPrice}</s> ${finalPrice}`, '');
    }

    const mediaGroup = salesWithImages.map(({ imageUrl }, index): BotMediaItem => {
      const mediaItem: BotMediaItem = {
        type: 'photo',
        media: imageUrl,
      };

      if (index === 0) {
        mediaItem.caption = captionLines.join('\n').trim();
        mediaItem.parseMode = 'HTML';
      }

      return mediaItem;
    });

    return mediaGroup;
  }

  private formatPrice(price?: number | null): string {
    if (typeof price !== 'number') {
      return 'Н/Д';
    }

    return `₴${price.toFixed(2)}`;
  }

  private sanitizeUrl(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  }
}
