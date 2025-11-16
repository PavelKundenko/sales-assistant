import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { SteamGateway } from './steam.gateway';
import { steamConfig } from '../../configuration';
import { SteamFeaturedResponse } from './interfaces/steam-game.interface';

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
    const responseData: SteamFeaturedResponse = { featured_win: [], large_capsules: [] };
    httpService.get.mockReturnValue(of({ data: responseData }) as never);

    const result = await gateway.fetchFeatured();

    expect(result).toEqual(responseData);
    expect(httpService.get.mock.calls).toHaveLength(1);
    const callUrl = httpService.get.mock.calls[0][0];
    expect(callUrl).toContain('/featured/');
  });

  it('returns data from successful response', async () => {
    const responseData: SteamFeaturedResponse = {
      featured_win: [
        {
          id: 123,
          name: 'Test Game',
          discounted: true,
          discount_percent: 50,
          original_price: 2000,
          final_price: 1000,
          header_image: 'test.jpg',
        },
      ],
    };
    httpService.get.mockReturnValue(of({ data: responseData }) as never);

    const result = await gateway.fetchFeatured();

    expect(result).toEqual(responseData);
  });

  it('wraps errors when the request fails', async () => {
    const originalError = new Error('boom');
    httpService.get.mockReturnValue(throwError(() => originalError) as never);

    await expect(gateway.fetchFeatured()).rejects.toThrow('Failed to fetch Steam sales');
  });

  it('preserves original error as cause when request fails', async () => {
    const originalError = new Error('Network timeout');
    httpService.get.mockReturnValue(throwError(() => originalError) as never);

    try {
      await gateway.fetchFeatured();
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Failed to fetch Steam sales');
      expect((error as Error).cause).toBe(originalError);
    }
  });
});
