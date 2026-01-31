import { Test, TestingModule } from '@nestjs/testing';
import { SalesMessageBuilder } from './sales-message.builder';
import { SteamSaleDto } from '../../../steam/dto/steam-sale.dto';

describe('SalesMessageBuilder', () => {
  let builder: SalesMessageBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesMessageBuilder],
    }).compile();

    builder = module.get<SalesMessageBuilder>(SalesMessageBuilder);
  });

  const mockSales: SteamSaleDto[] = [
    {
      appId: 10,
      name: 'Counter-Strike',
      originalPrice: 100,
      finalPrice: 80,
      discountPercent: 20,
      headerImage: 'https://example.com/image1.jpg',
      storeUrl: 'https://store.steampowered.com/app/10',
    } as SteamSaleDto,
    {
      appId: 20,
      name: 'Team Fortress Classic',
      originalPrice: 50,
      finalPrice: 50,
      discountPercent: 0,
      headerImage: 'https://example.com/image2.jpg',
      storeUrl: 'https://store.steampowered.com/app/20',
    } as SteamSaleDto,
  ];

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('build', () => {
    it('should correctly format a list of sales into a media group', () => {
      const result = builder.build(mockSales);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('photo');
      expect(result[0].media).toBe(mockSales[0].headerImage);
      expect(result[0].parseMode).toBe('HTML');
      expect(result[0].caption).toContain('Counter-Strike');
      expect(result[0].caption).toContain('💰 Знижка 20%');
      expect(result[0].caption).toContain('₴80.00');

      expect(result[1].type).toBe('photo');
      expect(result[1].media).toBe(mockSales[1].headerImage);
      expect(result[1].caption).toBeUndefined(); // Only the first item should have a caption
    });

    it('should respect the limit option', () => {
      const result = builder.build(mockSales, { limit: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].media).toBe(mockSales[0].headerImage);
    });

    it('should include the intro caption if provided', () => {
      const intro = 'Custom Intro';
      const result = builder.build(mockSales, { intro });

      expect(result[0].caption).toContain(intro);
    });

    it('should throw an error if the sales collection is empty', () => {
      expect(() => builder.build([])).toThrow('Sales collection is empty');
    });

    it('should throw an error if no valid images are available', () => {
      const salesNoImages = mockSales.map((s) => ({ ...s, headerImage: '' }));
      expect(() => builder.build(salesNoImages as SteamSaleDto[])).toThrow('No valid sales images available');
    });

    it('should filter out games without valid images', () => {
      const salesWithOneInvalid = [
        ...mockSales,
        { ...mockSales[0], appId: 30, headerImage: null as unknown as string } as SteamSaleDto,
      ];
      const result = builder.build(salesWithOneInvalid);

      expect(result).toHaveLength(2);
    });

    it('should escape HTML in captions', () => {
      const trickySale = [
        {
          ...mockSales[0],
          name: 'Game <script>alert("xss")</script> & Fun',
        },
      ] as SteamSaleDto[];

      const result = builder.build(trickySale);
      expect(result[0].caption).toContain('Game &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; Fun');
    });
  });
});
