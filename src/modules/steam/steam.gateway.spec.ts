import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { SteamGateway } from './steam.gateway';
import { steamConfig } from '../../configuration';
import { SteamFeaturedCategoriesResponse } from './interfaces/steam-game.interface';

describe('SteamGateway', () => {
  let gateway: SteamGateway;
  let httpService: jest.Mocked<HttpService>;
  const config = { apiUrl: 'https://store.steampowered.com/api' };

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

  it('returns data from successful response', async () => {
    const responseData: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          {
            id: 123,
            type: 0,
            name: 'Test Game',
            discounted: true,
            discount_percent: 50,
            original_price: 2000,
            final_price: 1000,
            currency: 'USD',
            large_capsule_image: 'large.jpg',
            small_capsule_image: 'small.jpg',
            windows_available: true,
            mac_available: true,
            linux_available: true,
            streamingvideo_available: true,
            header_image: 'test.jpg',
          },
        ],
      },
    };
    httpService.get.mockReturnValue(of({ data: responseData }) as never);

    const result = await gateway.fetchFeaturedCategories();

    expect(result).toEqual(responseData);
  });

  it('wraps errors when the request fails', async () => {
    const originalError = new Error('boom');
    httpService.get.mockReturnValue(throwError(() => originalError) as never);

    await expect(gateway.fetchFeaturedCategories()).rejects.toThrow('Failed to fetch Steam sales');
  });

  it('preserves original error as cause when request fails', async () => {
    const originalError = new Error('Network timeout');
    httpService.get.mockReturnValue(throwError(() => originalError) as never);

    try {
      await gateway.fetchFeaturedCategories();
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Failed to fetch Steam sales');
      expect((error as Error).cause).toBe(originalError);
    }
  });
});
