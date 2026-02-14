import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SteamService } from './steam.service';
import { SteamGateway } from './steam.gateway';
import { SteamFeaturedCategoriesResponse, SteamFeaturedItem } from './interfaces/steam-game.interface';
import { SteamSalesAdapter } from './steam-sales.adapter';

const mockGame = (overrides: Partial<SteamFeaturedItem> = {}): SteamFeaturedItem => ({
  id: 1,
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
  ...overrides,
});

describe('SteamService', () => {
  let service: SteamService;
  let gateway: jest.Mocked<SteamGateway>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteamService,
        SteamSalesAdapter,
        {
          provide: SteamGateway,
          useValue: {
            fetchFeaturedCategories: jest.fn(),
            fetchWishlist: jest.fn(),
            fetchAppDetails: jest.fn(),
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
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          mockGame({
            id: 1,
            name: 'Game A',
            discount_percent: 10,
            original_price: 3000,
            final_price: 2000,
          }),
          mockGame({
            id: 2,
            name: 'Game B',
            discount_percent: 5,
            original_price: 5000,
            final_price: 2000,
          }),
        ],
      },
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

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
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          mockGame({
            id: 1,
            name: 'Discounted Game',
            discounted: true,
            discount_percent: 50,
            original_price: 2000,
            final_price: 1000,
          }),
          mockGame({
            id: 2,
            name: 'Full Price Game',
            discounted: false,
            discount_percent: 0,
            original_price: 3000,
            final_price: 3000,
          }),
        ],
      },
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(1);
    expect(sales[0].appId).toBe(1);
  });

  it('filters out games with zero discount percentage', async () => {
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          mockGame({
            id: 1,
            name: 'Game with zero discount',
            discounted: true,
            discount_percent: 0,
            original_price: 2000,
            final_price: 2000,
          }),
        ],
      },
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(0);
  });

  it('handles games without original_price', async () => {
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          mockGame({
            id: 1,
            name: 'Game without original price',
            discounted: true,
            discount_percent: 10,
            original_price: null,
            final_price: 1000,
          }),
        ],
      },
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(1);
    expect(sales[0].originalPrice).toBe(0);
    expect(sales[0].finalPrice).toBe(10);
  });

  it('handles empty response', async () => {
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(0);
  });

  it('parses items from specials', async () => {
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          mockGame({
            id: 1,
            name: 'Featured Game',
            discount_percent: 10,
          }),
          mockGame({
            id: 2,
            name: 'Capsule Game',
            discount_percent: 20,
          }),
        ],
      },
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(2);
    expect(sales.some((sale) => sale.name === 'Featured Game')).toBe(true);
    expect(sales.some((sale) => sale.name === 'Capsule Game')).toBe(true);
  });

  it('includes discounted games from other categories', async () => {
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          mockGame({
            id: 1,
            name: 'Specials Game',
            discount_percent: 10,
          }),
        ],
      },
      top_sellers: {
        id: 'top_sellers',
        name: 'Top Sellers',
        items: [
          mockGame({
            id: 2,
            name: 'Top Seller Game',
            discount_percent: 30,
          }),
        ],
      },
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales).toHaveLength(2);
    expect(sales.some((sale) => sale.name === 'Specials Game')).toBe(true);
    expect(sales.some((sale) => sale.name === 'Top Seller Game')).toBe(true);
  });

  it('converts prices from cents to dollars', async () => {
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          mockGame({
            id: 1,
            original_price: 5999,
            final_price: 2999,
          }),
        ],
      },
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales[0].originalPrice).toBe(59.99);
    expect(sales[0].finalPrice).toBe(29.99);
  });

  it('includes store URL for each game', async () => {
    const response: SteamFeaturedCategoriesResponse = {
      status: 1,
      specials: {
        id: 'specials',
        name: 'Specials',
        items: [
          mockGame({
            id: 123456,
          }),
        ],
      },
    };

    gateway.fetchFeaturedCategories.mockResolvedValue(response);

    const sales = await service.getCurrentSales();

    expect(sales[0].storeUrl).toBe('https://store.steampowered.com/app/123456');
  });

  describe('getWishlist', () => {
    it('successfully parses multiple app details from wishlist', async () => {
      const wishlistResponse = {
        response: {
          items: [{ appid: 101 }, { appid: 102 }],
        },
      };

      const app101Response = {
        '101': {
          success: true,
          data: {
            steam_appid: 101,
            name: 'Game 101',
            price_overview: {
              initial: 2000,
              final: 1000,
              discount_percent: 50,
            },
          },
        },
      };

      const app102Response = {
        '102': {
          success: true,
          data: {
            steam_appid: 102,
            name: 'Game 102',
            price_overview: {
              initial: 3000,
              final: 1500,
              discount_percent: 50,
            },
          },
        },
      };

      gateway.fetchWishlist.mockResolvedValue(wishlistResponse as any);
      gateway.fetchAppDetails.mockImplementation((appId) => {
        if (appId === 101) return Promise.resolve(app101Response);
        if (appId === 102) return Promise.resolve(app102Response);
        return Promise.resolve({});
      });

      const result = await service.getWishlist('some-id');

      expect(result).toHaveLength(2);
      expect(result[0].appId).toBe(102); // Sorted by absolute discount (15 vs 10)
      expect(result[1].appId).toBe(101);
      expect(result[0].name).toBe('Game 102');
      expect(result[1].name).toBe('Game 101');
    });

    it('filters out failed app details', async () => {
      const wishlistResponse = {
        response: {
          items: [{ appid: 101 }, { appid: 102 }],
        },
      };

      const app101Response = {
        '101': {
          success: false,
        },
      };

      const app102Response = {
        '102': {
          success: true,
          data: {
            steam_appid: 102,
            name: 'Game 102',
            price_overview: {
              initial: 3000,
              final: 1500,
              discount_percent: 50,
            },
          },
        },
      };

      gateway.fetchWishlist.mockResolvedValue(wishlistResponse as any);
      gateway.fetchAppDetails.mockImplementation((appId) => {
        if (appId === 101) return Promise.resolve(app101Response as any);
        if (appId === 102) return Promise.resolve(app102Response as any);
        return Promise.resolve({});
      });

      const result = await service.getWishlist('some-id');

      expect(result).toHaveLength(1);
      expect(result[0].appId).toBe(102);
    });

    it('logs error and re-throws when fetchWishlist fails', async () => {
      const error = new Error('wishlist error');
      gateway.fetchWishlist.mockRejectedValue(error);

      await expect(service.getWishlist('some-id')).rejects.toThrow('wishlist error');
      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to fetch Steam wishlist for some-id', error);
    });
  });
});
