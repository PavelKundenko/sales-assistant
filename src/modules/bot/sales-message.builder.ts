import { Injectable } from '@nestjs/common';
import { SteamSaleDto } from '../steam/dto/steam-sale.dto';

import { InputMediaPhoto } from 'telegraf/types';

export type TelegramSalesMessage = InputMediaPhoto[];

@Injectable()
export class SalesMessageBuilder {
  buildTopSalesMessage(sales: SteamSaleDto[], limit = 10): TelegramSalesMessage {
    if (sales.length === 0) {
      throw new Error('Sales collection is empty');
    }

    const topSales = sales.slice(0, limit);
    const captionLines = ['🔥 Актуальні знижки у Steam:\n'];

    for (const game of topSales) {
      const name = game.name ?? 'Невідома назва';

      const discountPercent =
        game.discountPercent !== undefined && game.discountPercent !== null ? `${game.discountPercent}%` : 'Н/Д';

      const originalPrice = this.formatPrice(game.originalPrice);
      const finalPrice = this.formatPrice(game.finalPrice);

      const storeUrl = game.storeUrl ?? '#';

      captionLines.push(
        `<a href="${storeUrl}">${name}</a>`,
        `💰 Знижка ${discountPercent}`,
        `Ціна: <s>${originalPrice}</s> ${finalPrice}`,
        '',
      );
    }

    const mediaGroup = topSales.map((game, index) => {
      const mediaItem: any = {
        type: 'photo',
        media: game.headerImage || '',
      };

      if (index === 0) {
        mediaItem.caption = captionLines.join('\n').trim();
        mediaItem.parse_mode = 'HTML';
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
}
