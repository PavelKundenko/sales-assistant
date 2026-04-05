import { Injectable } from '@nestjs/common';
import {
  SteamAppDetailsData,
  SteamAppDetailsResponse,
  SteamFeaturedCategoriesResponse,
} from './interfaces/steam-game.interface';
import { SteamSaleDto } from './dto/steam-sale.dto';
import { SteamWishlistItemDto } from './dto/steam-wishlist-item.dto';
import { Platform } from '../../shared/enums/platform.enum';

type AppDetailsBase = {
  appId: number;
  name: string;
  headerImage: string;
  storeUrl: string;
  windowsAvailable: boolean;
  macAvailable: boolean;
  linuxAvailable: boolean;
  platforms: Platform[];
  price: SteamAppDetailsData['price_overview'];
  description: string;
};

@Injectable()
export class SteamSalesAdapter {
  fromFeaturedCategories(data: SteamFeaturedCategoriesResponse): SteamSaleDto[] {
    const games: SteamSaleDto[] = [];

    const specials = data.specials?.items || [];
    const topSellers = data.top_sellers?.items || [];

    const allGames = [...specials, ...topSellers];

    const gameTyped = allGames.filter((game) => game.type === 0);
    const uniqueGames = gameTyped.filter((game, index, self) => index === self.findIndex((t) => t.id === game.id));
    const discountedGames = uniqueGames.filter((game) => game.discounted && game.discount_percent > 0);

    for (const game of discountedGames) {
      games.push(
        new SteamSaleDto({
          appId: game.id,
          name: game.name,
          originalPrice: (game.original_price || 0) / 100,
          finalPrice: game.final_price / 100,
          discountPercent: game.discount_percent,
          headerImage: game.header_image,
          storeUrl: `https://store.steampowered.com/app/${game.id}`,
          macAvailable: game.mac_available,
          windowsAvailable: game.windows_available,
          linuxAvailable: game.linux_available,
          platforms: this.resolvePlatforms({
            windowsAvailable: game.windows_available,
            macAvailable: game.mac_available,
            linuxAvailable: game.linux_available,
          }),
          expiryDate: game.discount_expiration ? new Date(game.discount_expiration * 1000) : null,
        }),
      );
    }

    return this.rateSalesByAbsoluteDiscount(games);
  }

  fromAppDetails(data: SteamAppDetailsResponse[]): SteamSaleDto[] {
    const games: SteamSaleDto[] = [];

    for (const base of this.extractAppDetails(data)) {
      const originalPrice = base.price?.initial ? base.price.initial / 100 : 0;
      const finalPrice = base.price?.final ? base.price.final / 100 : originalPrice;

      games.push(
        new SteamSaleDto({
          appId: base.appId,
          name: base.name,
          originalPrice,
          finalPrice,
          discountPercent: base.price?.discount_percent ?? 0,
          headerImage: base.headerImage,
          storeUrl: base.storeUrl,
          macAvailable: base.macAvailable,
          windowsAvailable: base.windowsAvailable,
          linuxAvailable: base.linuxAvailable,
          platforms: base.platforms,
          expiryDate: null,
        }),
      );
    }

    return this.rateSalesByAbsoluteDiscount(games);
  }

  fromAppDetailsToWishlist(data: SteamAppDetailsResponse[]): SteamWishlistItemDto[] {
    const games: SteamWishlistItemDto[] = [];

    for (const base of this.extractAppDetails(data)) {
      const originalPrice = base.price?.initial ? base.price.initial / 100 : null;
      const finalPrice = base.price?.final ? base.price.final / 100 : originalPrice;

      games.push(
        new SteamWishlistItemDto({
          appId: base.appId,
          name: base.name,
          description: base.description,
          originalPrice,
          finalPrice,
          discountPercent: base.price?.discount_percent ?? null,
          headerImage: base.headerImage,
          storeUrl: base.storeUrl,
          macAvailable: base.macAvailable,
          windowsAvailable: base.windowsAvailable,
          linuxAvailable: base.linuxAvailable,
          platforms: base.platforms,
          expiryDate: null,
        }),
      );
    }

    return games;
  }

  private *extractAppDetails(data: SteamAppDetailsResponse[]): Iterable<AppDetailsBase> {
    for (const response of data) {
      for (const [appId, entry] of Object.entries(response)) {
        if (!entry?.success || !entry.data) {
          continue;
        }

        const details = entry.data;
        const parsedAppId = Number(details.steam_appid ?? appId);
        const resolvedAppId = Number.isNaN(parsedAppId) ? 0 : parsedAppId;
        const headerImage = details.header_image ?? (resolvedAppId ? this.buildHeaderImageUrl(resolvedAppId) : '');
        const windowsAvailable = details.platforms?.windows ?? false;
        const macAvailable = details.platforms?.mac ?? false;
        const linuxAvailable = details.platforms?.linux ?? false;

        yield {
          appId: resolvedAppId,
          name: details.name ?? `App ${appId}`,
          headerImage,
          storeUrl: `https://store.steampowered.com/app/${details.steam_appid ?? appId}`,
          windowsAvailable,
          macAvailable,
          linuxAvailable,
          platforms: this.resolvePlatforms({ windowsAvailable, macAvailable, linuxAvailable }),
          price: details.price_overview,
          description: details.short_description ?? '',
        };
      }
    }
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

  private resolvePlatforms(availability: {
    windowsAvailable: boolean;
    macAvailable: boolean;
    linuxAvailable: boolean;
  }): Platform[] {
    const platforms: Platform[] = [];

    if (availability.windowsAvailable) {
      platforms.push(Platform.PC);
    }

    if (availability.macAvailable) {
      platforms.push(Platform.MAC);
    }

    if (availability.linuxAvailable) {
      platforms.push(Platform.STEAM_DECK);
    }

    return platforms;
  }
}
