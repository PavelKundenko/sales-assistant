import { Test, TestingModule } from '@nestjs/testing';
import { WishlistMessageBuilder } from './wishlist-message.builder';
import { SteamWishlistItemDto } from '../../../steam/dto/steam-wishlist-item.dto';

describe('WishlistMessageBuilder', () => {
  let builder: WishlistMessageBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WishlistMessageBuilder],
    }).compile();

    builder = module.get<WishlistMessageBuilder>(WishlistMessageBuilder);
  });

  const mockWishlist: SteamWishlistItemDto[] = [
    {
      appId: 10,
      name: 'Counter-Strike',
      description: 'Tactical first-person shooter',
      originalPrice: 100,
      finalPrice: 80,
      discountPercent: 20,
      headerImage: 'https://example.com/image1.jpg',
      storeUrl: 'https://store.steampowered.com/app/10',
    } as SteamWishlistItemDto,
    {
      appId: 20,
      name: 'Team Fortress Classic',
      description: 'Class-based team shooter',
      originalPrice: 50,
      finalPrice: 50,
      discountPercent: 0,
      headerImage: 'https://example.com/image2.jpg',
      storeUrl: 'https://store.steampowered.com/app/20',
    } as SteamWishlistItemDto,
  ];

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('build', () => {
    it('should correctly format a wishlist into a media group', () => {
      const result = builder.build(mockWishlist);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('photo');
      expect(result[0].media).toBe(mockWishlist[0].headerImage);
      expect(result[0].parseMode).toBe('HTML');
      expect(result[0].caption).toContain('Counter-Strike');
      expect(result[0].caption).toContain('💰 Знижка 20%');
      expect(result[0].caption).toContain('₴80.00');
      expect(result[0].caption).toContain('Team Fortress Classic');
      expect(result[0].caption).toContain('Ціна: ₴50.00');

      expect(result[1].type).toBe('photo');
      expect(result[1].media).toBe(mockWishlist[1].headerImage);
      expect(result[1].caption).toBeUndefined(); // Only the first item should have a caption
    });

    it('should include the intro caption if provided', () => {
      const intro = 'Your wishlist items:';
      const result = builder.build(mockWishlist, { intro });

      expect(result[0].caption).toContain(intro);
    });

    it('should throw an error if the wishlist collection is empty', () => {
      expect(() => builder.build([])).toThrow('Wishlist collection is empty');
    });

    it('should throw an error if no valid images are available', () => {
      const itemsNoImages = mockWishlist.map((i) => ({ ...i, headerImage: '' }));
      expect(() => builder.build(itemsNoImages as SteamWishlistItemDto[])).toThrow(
        'No valid wishlist images available',
      );
    });

    it('should filter out items without header images', () => {
      const itemsWithOneInvalid = [
        ...mockWishlist,
        { ...mockWishlist[0], appId: 30, headerImage: null as unknown as string } as SteamWishlistItemDto,
      ];
      const result = builder.build(itemsWithOneInvalid);

      expect(result).toHaveLength(2);
    });

    it('should correctly handle items without discounts in the text block', () => {
      const items = [
        {
          ...mockWishlist[1], // No discount
        },
      ] as SteamWishlistItemDto[];

      const result = builder.build(items);
      expect(result[0].caption).toContain('Team Fortress Classic');
      expect(result[0].caption).toContain('Ціна: ₴50.00');
      expect(result[0].caption).not.toContain('💰 Знижка');
    });
  });
});
