import { Injectable, Logger } from '@nestjs/common';
import { SteamFeaturedCategoriesResponse } from './interfaces/steam-game.interface';
import { SteamSaleDto } from './dto/steam-sale.dto';
import { SteamGateway } from './steam.gateway';

@Injectable()
export class SteamService {
  private readonly logger = new Logger(SteamService.name);

  constructor(private readonly steamGateway: SteamGateway) {}

  async getCurrentSales(): Promise<SteamSaleDto[]> {
    try {
      const data = await this.steamGateway.fetchFeaturedCategories();

      return this.parseFeaturedGames(data);
    } catch (error) {
      this.logger.error('Failed to fetch Steam sales', error);
      throw error;
    }
  }

  private parseFeaturedGames(data: SteamFeaturedCategoriesResponse): SteamSaleDto[] {
    const games: SteamSaleDto[] = [];

    const specials = data.specials?.items || [];

    for (const game of specials) {
      if (game.discounted && game.discount_percent > 0) {
        games.push(
          new SteamSaleDto({
            appId: game.id,
            name: game.name,
            originalPrice: (game.original_price || 0) / 100,
            finalPrice: game.final_price / 100,
            discountPercent: game.discount_percent,
            headerImage: game.header_image,
            storeUrl: `https://store.steampowered.com/app/${game.id}`,
          }),
        );
      }
    }

    return this.rateSalesByAbsoluteDiscount(games);
  }

  private rateSalesByAbsoluteDiscount(list: SteamSaleDto[]): SteamSaleDto[] {
    return [...list].sort((a, b) => {
      const discountA = (a.originalPrice ?? 0) - (a.finalPrice ?? a.originalPrice ?? 0);
      const discountB = (b.originalPrice ?? 0) - (b.finalPrice ?? b.originalPrice ?? 0);

      return discountB - discountA;
    });
  }
}
