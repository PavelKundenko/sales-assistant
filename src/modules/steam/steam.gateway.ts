import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { steamConfig } from '../../configuration';
import { SteamFeaturedResponse } from './interfaces/steam-game.interface';

@Injectable()
export class SteamGateway {
  constructor(
    private readonly httpService: HttpService,
    @Inject(steamConfig.KEY)
    private readonly config: ConfigType<typeof steamConfig>,
  ) {}

  async fetchFeatured(): Promise<SteamFeaturedResponse> {
    try {
      const observable = this.httpService.get<SteamFeaturedResponse>(`${this.config.apiUrl}/featured/`);

      const response = await lastValueFrom(observable);

      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch Steam sales', { cause: error });
    }
  }
}
