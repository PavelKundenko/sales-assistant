import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { steamConfig } from '../../configuration';
import { SteamAppDetailsResponse, SteamFeaturedCategoriesResponse } from './interfaces/steam-game.interface';
import {
  SteamPlayerSummariesResponse,
  SteamPlayerResponse,
  SteamWishlistResponse,
} from './interfaces/steam-user.interface';

@Injectable()
export class SteamGateway {
  constructor(
    private readonly httpService: HttpService,
    @Inject(steamConfig.KEY)
    private readonly config: ConfigType<typeof steamConfig>,
  ) {}

  async fetchFeaturedCategories(countryCode = 'UA'): Promise<SteamFeaturedCategoriesResponse> {
    try {
      const featuredCategoriesObservable = this.httpService.get<SteamFeaturedCategoriesResponse>(
        `${this.config.storeUrl}/featuredcategories`,
        { params: { cc: countryCode } },
      );

      const featuredCategoriesResponse = await lastValueFrom(featuredCategoriesObservable);

      return featuredCategoriesResponse.data;
    } catch (error) {
      throw new Error('Failed to fetch Steam sales', { cause: error });
    }
  }

  async resolveSteamUser(steamId: string): Promise<SteamPlayerResponse> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.get<SteamPlayerSummariesResponse>(
          `${this.config.webApiUrl}/ISteamUser/GetPlayerSummaries/v0002/`,
          {
            params: {
              key: this.config.apiKey,
              steamids: steamId,
            },
          },
        ),
      );

      const player = data.response.players?.[0];

      if (!player) {
        throw new Error('User not found');
      }

      return player;
    } catch (error) {
      throw new Error(`Failed to resolve Steam user: ${steamId}`, { cause: error });
    }
  }

  async fetchWishlist(steamId: string): Promise<SteamWishlistResponse> {
    try {
      const params: Record<string, string> = {
        steamid: steamId,
      };

      if (this.config.apiKey) {
        params.key = this.config.apiKey;
      }

      const { data } = await lastValueFrom(
        this.httpService.get<SteamWishlistResponse>(`${this.config.webApiUrl}/IWishlistService/GetWishlist/v1`, {
          params,
        }),
      );

      return data;
    } catch (error) {
      throw new Error(`Failed to fetch wishlist for Steam ID: ${steamId}`, { cause: error });
    }
  }

  async fetchAppDetails(
    appId: number,
    countryCode = 'UA',
    filters = ['basic', 'price_overview', 'platforms'],
  ): Promise<SteamAppDetailsResponse> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.get<SteamAppDetailsResponse>(`${this.config.storeUrl}/appdetails`, {
          params: { appids: appId, cc: countryCode, filters: filters.join(',') },
        }),
      );

      return data;
    } catch (error) {
      throw new Error(`Failed to fetch Steam app details for ids: ${appId}`, { cause: error });
    }
  }
}
