import { Injectable } from '@nestjs/common';
import { SteamAppDetailsResponse, SteamFeaturedCategoriesResponse } from './interfaces/steam-game.interface';
import { SteamSaleDto } from './dto/steam-sale.dto';
import { SteamWishlistItemDto } from './dto/steam-wishlist-item.dto';

@Injectable()
export class SteamSalesAdapter {
  fromFeaturedCategories(data: SteamFeaturedCategoriesResponse): SteamSaleDto[] {
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

  fromAppDetails(data: SteamAppDetailsResponse[]): SteamSaleDto[] {
    const games: SteamSaleDto[] = [];

    for (const response of data) {
      for (const [appId, entry] of Object.entries(response)) {
        if (!entry?.success || !entry.data) {
          continue;
        }

        const details = entry.data;
        const price = details.price_overview;
        const parsedAppId = Number(details.steam_appid ?? appId);
        const originalPrice = price?.initial ? price.initial / 100 : 0;
        const finalPrice = price?.final ? price.final / 100 : originalPrice;
        const resolvedAppId = Number.isNaN(parsedAppId) ? 0 : parsedAppId;
        const headerImage = details.header_image ?? (resolvedAppId ? this.buildHeaderImageUrl(resolvedAppId) : '');

        games.push(
          new SteamSaleDto({
            appId: resolvedAppId,
            name: details.name ?? `App ${appId}`,
            originalPrice,
            finalPrice,
            discountPercent: price?.discount_percent ?? 0,
            headerImage,
            storeUrl: `https://store.steampowered.com/app/${details.steam_appid ?? appId}`,
          }),
        );
      }
    }

    return this.rateSalesByAbsoluteDiscount(games);
  }

  fromAppDetailsToWishlist(data: SteamAppDetailsResponse[]): SteamWishlistItemDto[] {
    const games: SteamWishlistItemDto[] = [];

    for (const response of data) {
      for (const [appId, entry] of Object.entries(response)) {
        if (!entry?.success || !entry.data) {
          continue;
        }

        const details = entry.data;
        const parsedAppId = Number(details.steam_appid ?? appId);
        const resolvedAppId = Number.isNaN(parsedAppId) ? 0 : parsedAppId;
        const headerImage = details.header_image ?? (resolvedAppId ? this.buildHeaderImageUrl(resolvedAppId) : '');
        const price = details.price_overview;
        const originalPrice = price?.initial ? price.initial / 100 : null;
        const finalPrice = price?.final ? price.final / 100 : originalPrice;
        const discountPercent = price?.discount_percent ?? null;

        games.push(
          new SteamWishlistItemDto({
            appId: resolvedAppId,
            name: details.name ?? `App ${appId}`,
            description: details.short_description ?? '',
            originalPrice,
            finalPrice,
            discountPercent,
            headerImage,
            storeUrl: `https://store.steampowered.com/app/${details.steam_appid ?? appId}`,
          }),
        );
      }
    }

    return games;
  }

  private buildHeaderImageUrl(appId: number): string {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
  }

  private rateSalesByAbsoluteDiscount(list: SteamSaleDto[]): SteamSaleDto[] {
    return [...list].sort((a, b) => {
      const discountA = (a.originalPrice ?? 0) - (a.finalPrice ?? a.originalPrice ?? 0);
      const discountB = (b.originalPrice ?? 0) - (b.finalPrice ?? b.originalPrice ?? 0);

      return discountB - discountA;
    });
  }
}
