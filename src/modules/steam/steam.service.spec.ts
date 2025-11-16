import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SteamService } from './steam.service';
import { SteamGateway } from './steam.gateway';
import { SteamFeaturedResponse } from './interfaces/steam-game.interface';

describe('SteamService', () => {
  let service: SteamService;
  let gateway: jest.Mocked<SteamGateway>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteamService,
        {
          provide: SteamGateway,
          useValue: {
            fetchFeatured: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SteamService>(SteamService);
    gateway = module.get(SteamGateway);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('returns sales sorted by absolute discount amount', async () => {
    const response: SteamFeaturedResponse = {
      featured_win: [
        {
          id: 1,
          name: 'Game A',
          discounted: true,
          discount_percent: 10,
          original_price: 3000,
          final_price: 2000,
          header_image: 'image-a',
        },
      ],
      large_capsules: [
        {
          id: 2,
          name: 'Game B',
          discounted: true,
          discount_percent: 5,
          original_price: 5000,
          final_price: 2000,
          header_image: 'image-b',
        },
      ],
    };

    gateway.fetchFeatured.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(2);
    expect(sales[0].appId).toBe(2);
    expect(sales[0].name).toBe('Game B');
    expect(sales[0].originalPrice).toBe(50);
    expect(sales[0].finalPrice).toBe(20);
    expect(sales[1].appId).toBe(1);
    expect(sales[1].name).toBe('Game A');
    expect(sales[1].originalPrice).toBe(30);
    expect(sales[1].finalPrice).toBe(20);
  });

  it('filters out non-discounted games', async () => {
    const response: SteamFeaturedResponse = {
      featured_win: [
        {
          id: 1,
          name: 'Discounted Game',
          discounted: true,
          discount_percent: 50,
          original_price: 2000,
          final_price: 1000,
          header_image: 'image-1',
        },
        {
          id: 2,
          name: 'Full Price Game',
          discounted: false,
          discount_percent: 0,
          original_price: 3000,
          final_price: 3000,
          header_image: 'image-2',
        },
      ],
    };

    gateway.fetchFeatured.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(1);
    expect(sales[0].appId).toBe(1);
  });

  it('filters out games with zero discount percentage', async () => {
    const response: SteamFeaturedResponse = {
      featured_win: [
        {
          id: 1,
          name: 'Game with zero discount',
          discounted: true,
          discount_percent: 0,
          original_price: 2000,
          final_price: 2000,
          header_image: 'image-1',
        },
      ],
    };

    gateway.fetchFeatured.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(0);
  });

  it('handles games without original_price', async () => {
    const response: SteamFeaturedResponse = {
      featured_win: [
        {
          id: 1,
          name: 'Game without original price',
          discounted: true,
          discount_percent: 10,
          final_price: 1000,
          header_image: 'image-1',
        },
      ],
    };

    gateway.fetchFeatured.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(1);
    expect(sales[0].originalPrice).toBe(0);
    expect(sales[0].finalPrice).toBe(10);
  });

  it('handles empty response', async () => {
    const response: SteamFeaturedResponse = {};

    gateway.fetchFeatured.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(0);
  });

  it('combines featured_win and large_capsules arrays', async () => {
    const response: SteamFeaturedResponse = {
      featured_win: [
        {
          id: 1,
          name: 'Featured Game',
          discounted: true,
          discount_percent: 10,
          original_price: 2000,
          final_price: 1800,
          header_image: 'image-1',
        },
      ],
      large_capsules: [
        {
          id: 2,
          name: 'Capsule Game',
          discounted: true,
          discount_percent: 20,
          original_price: 3000,
          final_price: 2400,
          header_image: 'image-2',
        },
      ],
    };

    gateway.fetchFeatured.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(2);
    expect(sales.some((sale) => sale.name === 'Featured Game')).toBe(true);
    expect(sales.some((sale) => sale.name === 'Capsule Game')).toBe(true);
  });

  it('converts prices from cents to dollars', async () => {
    const response: SteamFeaturedResponse = {
      featured_win: [
        {
          id: 1,
          name: 'Game',
          discounted: true,
          discount_percent: 50,
          original_price: 5999,
          final_price: 2999,
          header_image: 'image-1',
        },
      ],
    };

    gateway.fetchFeatured.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales[0].originalPrice).toBe(59.99);
    expect(sales[0].finalPrice).toBe(29.99);
  });

  it('includes store URL for each game', async () => {
    const response: SteamFeaturedResponse = {
      featured_win: [
        {
          id: 123456,
          name: 'Test Game',
          discounted: true,
          discount_percent: 25,
          original_price: 4000,
          final_price: 3000,
          header_image: 'image-1',
        },
      ],
    };

    gateway.fetchFeatured.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales[0].storeUrl).toBe('https://store.steampowered.com/app/123456');
  });

  it('logs error and re-throws when gateway fails', async () => {
    const error = new Error('network down');
    gateway.fetchFeatured.mockRejectedValue(error);

    await expect(service.getCurrentSales()).rejects.toThrow('network down');
    expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to fetch Steam sales', error);
  });
});
