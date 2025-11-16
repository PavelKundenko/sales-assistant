import { Injectable } from '@nestjs/common';
import { SteamSaleDto } from '../steam/dto/steam-sale.dto';

export interface TelegramSalesMessage {
  photoUrl: string;
  caption: string;
}

@Injectable()
export class SalesMessageBuilder {
  buildTopSalesMessage(sales: SteamSaleDto[], limit = 10): TelegramSalesMessage {
    if (sales.length === 0) {
      throw new Error('Sales collection is empty');
    }

    const topSales = sales.slice(0, limit);
    const captionLines = ['🔥 Current Steam Sales:\n'];

    for (const game of topSales) {
      const name = game.name ?? 'Unknown title';

      const discountPercent =
        game.discountPercent !== undefined && game.discountPercent !== null ? `${game.discountPercent}%` : 'N/A';

      const originalPrice = this.formatPrice(game.originalPrice);
      const finalPrice = this.formatPrice(game.finalPrice);

      const storeUrl = game.storeUrl ?? '#';

      captionLines.push(
        `<a href="${storeUrl}">${name}</a>`,
        `💰 ${discountPercent} OFF`,
        `Price: <s>${originalPrice}</s> ${finalPrice}`,
        '',
      );
    }

    const photoUrl = topSales[0].headerImage ?? '';

    return {
      photoUrl,
      caption: captionLines.join('\n').trim(),
    };
  }

  private formatPrice(price?: number | null): string {
    if (typeof price !== 'number') {
      return 'N/A';
    }

    return `₴${price.toFixed(2)}`;
  }
}
