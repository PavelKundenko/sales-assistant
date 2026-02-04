import { Test, TestingModule } from '@nestjs/testing';
import { WishlistMessageBuilder } from './wishlist-message.builder';
import { SteamWishlistItemDto } from '../../../steam/dto/steam-wishlist-item.dto';
import { Platform } from '../../../users/entities/user-preferences.entity';

describe('WishlistMessageBuilder', () => {
  let builder: WishlistMessageBuilder;

  const expectMediaGroup = (sequence: ReturnType<WishlistMessageBuilder['build']>) => {
    const message = sequence[0];
    if (message?.type !== 'mediaGroup') {
      throw new Error('Expected mediaGroup message');
    }
    return message;
  };

  const expectTextMessage = (sequence: ReturnType<WishlistMessageBuilder['build']>) => {
    const message = sequence[1];
    if (message?.type !== 'text') {
      throw new Error('Expected text message');
    }
    return message;
  };

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
      platforms: [Platform.PC, Platform.MAC],
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
      platforms: [Platform.PC],
    } as SteamWishlistItemDto,
  ];

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('build', () => {
    it('should correctly format a wishlist into a message sequence', () => {
      const result = builder.build(mockWishlist);

      expect(result).toHaveLength(2);
      const mediaMessage = expectMediaGroup(result);
      const textMessage = expectTextMessage(result);

      expect(mediaMessage.media).toHaveLength(2);
      expect(mediaMessage.media[0].media).toBe(mockWishlist[0].headerImage);
      expect(mediaMessage.media[1].media).toBe(mockWishlist[1].headerImage);

      expect(textMessage.options?.parseMode).toBe('HTML');
      expect(textMessage.text).toContain('Counter-Strike');
      expect(textMessage.text).toContain('💰 Знижка 20%');
      expect(textMessage.text).toContain('₴80.00');
      expect(textMessage.text).toContain('Платформи: PC, Mac');
      expect(textMessage.text).toContain('Team Fortress Classic');
      expect(textMessage.text).toContain('Ціна: ₴50.00');
    });

    it('should include the intro caption if provided', () => {
      const intro = 'Your wishlist items:';
      const result = builder.build(mockWishlist, { intro });

      const textMessage = expectTextMessage(result);
      expect(textMessage.text).toContain(intro);
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

      const mediaMessage = expectMediaGroup(result);
      expect(mediaMessage.media).toHaveLength(2);
    });

    it('should correctly handle items without discounts in the text block', () => {
      const items = [
        {
          ...mockWishlist[1], // No discount
        },
      ] as SteamWishlistItemDto[];

      const result = builder.build(items);
      const textMessage = expectTextMessage(result);
      expect(textMessage.text).toContain('Team Fortress Classic');
      expect(textMessage.text).toContain('Ціна: ₴50.00');
      expect(textMessage.text).toContain('Платформи: PC');
      expect(textMessage.text).not.toContain('💰 Знижка');
    });
  });
});
