import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { steamConfig } from '../../configuration';
import { SteamFeaturedCategoriesResponse } from './interfaces/steam-game.interface';

@Injectable()
export class SteamGateway {
  constructor(
    private readonly httpService: HttpService,
    @Inject(steamConfig.KEY)
    private readonly config: ConfigType<typeof steamConfig>,
  ) {}

  async fetchFeaturedCategories(): Promise<SteamFeaturedCategoriesResponse> {
    try {
      const featuredCategoriesObservable = this.httpService.get<SteamFeaturedCategoriesResponse>(
        `${this.config.apiUrl}/featuredcategories`,
        { params: { cc: 'UA' } },
      );

      const featuredCategoriesResponse = await lastValueFrom(featuredCategoriesObservable);

      return featuredCategoriesResponse.data;
    } catch (error) {
      throw new Error('Failed to fetch Steam sales', { cause: error });
    }
  }
}
