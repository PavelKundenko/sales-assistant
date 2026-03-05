import { Injectable, Logger } from '@nestjs/common';
import { SteamSaleDto } from './dto/steam-sale.dto';
import { SteamWishlistItemDto } from './dto/steam-wishlist-item.dto';
import { SteamGateway } from './steam.gateway';
import { SteamSalesAdapter } from './steam-sales.adapter';
import type { SteamPlayerResponse } from './interfaces/steam-user.interface';
import { mapWithConcurrency } from './utils/concurrency.util';

const FETCH_CONCURRENCY = 5;

@Injectable()
export class SteamService {
  private readonly logger = new Logger(SteamService.name);

  constructor(
    private readonly steamGateway: SteamGateway,
    private readonly steamSalesAdapter: SteamSalesAdapter,
  ) {}

  async getCurrentSales(): Promise<SteamSaleDto[]> {
    try {
      const data = await this.steamGateway.fetchFeaturedCategories();

      return this.steamSalesAdapter.fromFeaturedCategories(data);
    } catch (error) {
      this.logger.error('Failed to fetch Steam sales', error);
      throw error;
    }
  }

  async getWishlist(steamId: string): Promise<SteamSaleDto[]> {
    try {
      const { response } = await this.steamGateway.fetchWishlist(steamId);

      const appIds = response.items?.map((item) => item.appid) || [];

      const apps = await mapWithConcurrency(appIds, FETCH_CONCURRENCY, (appId) =>
        this.steamGateway.fetchAppDetails(appId),
      );

      return this.steamSalesAdapter.fromAppDetails(apps);
    } catch (error) {
      this.logger.error(`Failed to fetch Steam wishlist for ${steamId}`, error);
      throw error;
    }
  }

  async getWishlistItems(steamId: string): Promise<SteamWishlistItemDto[]> {
    try {
      const { response } = await this.steamGateway.fetchWishlist(steamId);

      const appIds = response?.items?.map((item) => item.appid) || [];

      const apps = await mapWithConcurrency(appIds, FETCH_CONCURRENCY, (appId) =>
        this.steamGateway.fetchAppDetails(appId),
      );

      return this.steamSalesAdapter.fromAppDetailsToWishlist(apps);
    } catch (error) {
      this.logger.error(`Failed to fetch Steam wishlist for ${steamId}`, error);
      throw error;
    }
  }

  async resolveSteamUser(steamId: string): Promise<SteamPlayerResponse> {
    return this.steamGateway.resolveSteamUser(steamId);
  }
}
