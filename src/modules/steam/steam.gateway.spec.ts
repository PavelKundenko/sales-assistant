import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { SteamGateway } from './steam.gateway';
import { steamConfig } from '../../configuration';
import { SteamAppDetailsResponse, SteamFeaturedCategoriesResponse } from './interfaces/steam-game.interface';
import {
  SteamPlayerSummariesResponse,
  SteamPlayerResponse,
  SteamWishlistResponse,
} from './interfaces/steam-user.interface';

describe('SteamGateway', () => {
  let gateway: SteamGateway;
  let httpService: jest.Mocked<HttpService>;
  const config = {
    storeUrl: 'https://store.steampowered.com/api',
    webApiUrl: 'https://api.steampowered.com',
    apiKey: 'test-api-key',
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteamGateway,
        { provide: HttpService, useValue: mockHttpService },
        { provide: steamConfig.KEY, useValue: config },
      ],
    }).compile();

    gateway = module.get(SteamGateway);
    httpService = module.get(HttpService);
  });

  describe('fetchFeaturedCategories', () => {
    it('fetches featured games using HttpService', async () => {
      const responseData: SteamFeaturedCategoriesResponse = {
        status: 1,
        specials: { id: 'specials', name: 'Specials', items: [] },
      };
      httpService.get.mockReturnValue(of({ data: responseData }) as never);

      const result = await gateway.fetchFeaturedCategories();

      expect(result).toEqual(responseData);
      expect(httpService.get.mock.calls).toHaveLength(1);
      const callUrl = httpService.get.mock.calls[0][0];
      expect(callUrl).toContain('/featuredcategories');
      const callConfig = httpService.get.mock.calls[0][1];
      expect(callConfig).toEqual({ params: { cc: 'UA' } });
    });

    it('wraps errors when the request fails', async () => {
      const originalError = new Error('boom');
      httpService.get.mockReturnValue(throwError(() => originalError) as never);

      await expect(gateway.fetchFeaturedCategories()).rejects.toThrow('Failed to fetch Steam sales');
    });
  });

  describe('resolveSteamUser', () => {
    it('returns raw player info when user is found via Web API', async () => {
      const steamId = '76561198000000000';
      const playerInfo: SteamPlayerResponse = {
        steamid: steamId,
        personaname: 'TestUser',
        profileurl: 'https://steamcommunity.com/id/testuser/',
        avatar: 'https://example.com/avatar.jpg',
        avatarmedium: 'https://example.com/avatar_medium.jpg',
        avatarfull: 'https://example.com/avatar_full.jpg',
        avatarhash: 'abc123',
        personastate: 1,
        communityvisibilitystate: 3,
      };

      const apiResponse: SteamPlayerSummariesResponse = {
        response: {
          players: [playerInfo],
        },
      };

      httpService.get.mockReturnValue(of({ data: apiResponse }) as never);

      const result = await gateway.resolveSteamUser(steamId);

      expect(result).toEqual(playerInfo);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(httpService.get).toHaveBeenCalledWith(`${config.webApiUrl}/ISteamUser/GetPlayerSummaries/v0002/`, {
        params: {
          key: config.apiKey,
          steamids: steamId,
        },
      });
    });

    it('throws error when user is not found (empty array)', async () => {
      const steamId = '76561198000000000';
      const apiResponse: SteamPlayerSummariesResponse = {
        response: {
          players: [],
        },
      };

      httpService.get.mockReturnValue(of({ data: apiResponse }) as never);

      await expect(gateway.resolveSteamUser(steamId)).rejects.toThrow(`Failed to resolve Steam user: ${steamId}`);
    });

    it('wraps errors when the request fails', async () => {
      const steamId = 'any';
      const originalError = new Error('Network error');
      httpService.get.mockReturnValue(throwError(() => originalError) as never);

      await expect(gateway.resolveSteamUser(steamId)).rejects.toThrow(`Failed to resolve Steam user: ${steamId}`);
    });
  });

  describe('fetchWishlist', () => {
    it('fetches wishlist data for a given Steam ID', async () => {
      const steamId = '76561198000000000';
      const mockWishlist: SteamWishlistResponse = {
        response: {
          items: [
            {
              appid: 10,
              priority: 0,
              date_added: 12345678,
            },
          ],
          total_count: 1,
        },
      };

      httpService.get.mockReturnValue(of({ data: mockWishlist }) as never);

      const result = await gateway.fetchWishlist(steamId);

      expect(result).toEqual(mockWishlist);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(httpService.get).toHaveBeenCalledWith(`${config.webApiUrl}/IWishlistService/GetWishlist/v1`, {
        params: { key: config.apiKey, steamid: steamId },
      });
    });

    it('wraps errors when the request fails', async () => {
      const steamId = '76561198000000000';
      const originalError = new Error('Wishlist private');
      httpService.get.mockReturnValue(throwError(() => originalError) as never);

      await expect(gateway.fetchWishlist(steamId)).rejects.toThrow(`Failed to fetch wishlist for Steam ID: ${steamId}`);
    });
  });

  describe('fetchAppDetails', () => {
    it('fetches app details for the provided app id', async () => {
      const appId = 10;
      const response: SteamAppDetailsResponse = {
        '10': {
          success: true,
          data: {
            steam_appid: 10,
            name: 'Counter-Strike',
          },
        },
      };

      httpService.get.mockReturnValue(of({ data: response }) as never);

      const result = await gateway.fetchAppDetails(appId);

      expect(result).toEqual(response);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(httpService.get).toHaveBeenCalledWith(`${config.storeUrl}/appdetails`, {
        params: { appids: appId, cc: 'UA', filters: 'basic,price_overview' },
      });
    });

    it('wraps errors when the request fails', async () => {
      const appId = 10;
      const originalError = new Error('App details error');
      httpService.get.mockReturnValue(throwError(() => originalError) as never);

      await expect(gateway.fetchAppDetails(appId)).rejects.toThrow(
        `Failed to fetch Steam app details for ids: ${appId}`,
      );
    });
  });
});
