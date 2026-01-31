/* eslint-disable @typescript-eslint/unbound-method */
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import {
  BOT_SALES_MESSAGE_BUILDER,
  BOT_STEAM_SERVICE,
  BOT_SUBSCRIPTIONS_SERVICE,
  BOT_USERS_SERVICE,
  BOT_WISHLIST_MESSAGE_BUILDER,
  type SalesMessageBuilderPort,
  type SteamServicePort,
  type SubscriptionsServicePort,
  type UsersServicePort,
  type WishlistMessageBuilderPort,
} from '../ports/bot.ports';
import { BOT_MESSENGER, type BotMessenger, type BotRequest } from './bot.types';
import { BotContextService } from './bot-context.service';
import { BotMessages } from '../messaging/bot.messages';
import { SubscriptionType } from '../../subscriptions/entities/subscription.entity';
import { UserEntity } from '../../users/entities/user.entity';

describe('BotService', () => {
  let service: BotService;
  let messenger: jest.Mocked<BotMessenger>;
  let steamService: jest.Mocked<SteamServicePort>;
  let salesMessageBuilder: jest.Mocked<SalesMessageBuilderPort>;
  let wishlistMessageBuilder: jest.Mocked<WishlistMessageBuilderPort>;
  let usersService: jest.Mocked<UsersServicePort>;
  let subscriptionsService: jest.Mocked<SubscriptionsServicePort>;
  let contextService: jest.Mocked<BotContextService>;
  let messages: jest.Mocked<BotMessages>;

  beforeEach(async () => {
    messenger = {
      sendMessage: jest.fn(),
      sendMediaGroup: jest.fn(),
    } as unknown as jest.Mocked<BotMessenger>;

    steamService = {
      getCurrentSales: jest.fn(),
      getWishlistItems: jest.fn(),
      resolveSteamUser: jest.fn(),
    };

    salesMessageBuilder = {
      build: jest.fn(),
    };

    wishlistMessageBuilder = {
      build: jest.fn(),
    };

    usersService = {
      findByTelegramId: jest.fn(),
      createOrGet: jest.fn(),
      setSteamId: jest.fn(),
      getUsersWithSteamId: jest.fn(),
    };

    subscriptionsService = {
      createForUser: jest.fn(),
      deactivate: jest.fn(),
      findActiveByUser: jest.fn(),
      findActiveByType: jest.fn(),
    };

    contextService = {
      getSubscriptionContext: jest.fn(),
    } as unknown as jest.Mocked<BotContextService>;

    messages = {
      startMessage: jest.fn(),
      salesLoadingMessage: jest.fn(),
      salesEmptyMessage: jest.fn(),
      salesErrorMessage: jest.fn(),
      helpMessage: jest.fn(),
      subscribeMessage: jest.fn(),
      unsubscribeMessage: jest.fn(),
      wishlistLoadingMessage: jest.fn(),
      wishlistEmptyMessage: jest.fn(),
      wishlistErrorMessage: jest.fn(),
      wishlistSummaryOptions: jest.fn(),
      steamIdGuideMessage: jest.fn(),
      steamIdAlreadyConnectedMessage: jest.fn(),
      steamIdConnectedMessage: jest.fn(),
      steamIdNotFoundMessage: jest.fn(),
      startRequiredMessage: jest.fn(),
      unknownTextMessage: jest.fn(),
    } as unknown as jest.Mocked<BotMessages>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: BOT_MESSENGER, useValue: messenger },
        { provide: BOT_STEAM_SERVICE, useValue: steamService },
        { provide: BOT_SALES_MESSAGE_BUILDER, useValue: salesMessageBuilder },
        { provide: BOT_WISHLIST_MESSAGE_BUILDER, useValue: wishlistMessageBuilder },
        { provide: BOT_USERS_SERVICE, useValue: usersService },
        { provide: BOT_SUBSCRIPTIONS_SERVICE, useValue: subscriptionsService },
        { provide: BotContextService, useValue: contextService },
        { provide: BotMessages, useValue: messages },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    service = module.get<BotService>(BotService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockUser = { id: 'u1', telegramId: '123', steamId: 's1' } as UserEntity;
  const mockRequest: BotRequest = { chatId: 123, telegramUserId: 123, text: '/start' };

  describe('handleStart', () => {
    it('should create user and send start message', async () => {
      usersService.createOrGet.mockResolvedValue([mockUser, true]);
      subscriptionsService.findActiveByUser.mockResolvedValue([]);
      messages.startMessage.mockReturnValue({ text: 'Welcome' });

      await service.handleStart(mockRequest);

      expect(usersService.createOrGet as jest.Mock).toHaveBeenCalledWith('123');
      expect(messages.startMessage as jest.Mock).toHaveBeenCalledWith(true, false, true);
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Welcome', undefined);
    });

    it('should return early if telegramUserId is missing', async () => {
      await service.handleStart({ ...mockRequest, telegramUserId: null });
      expect(usersService.createOrGet as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('handleSalesCommand', () => {
    it('should send sales media group', async () => {
      const mockSales = [{ name: 'Game 1' }] as any;
      const mockMedia = [{ type: 'photo', media: 'img' }] as any;

      messages.salesLoadingMessage.mockReturnValue({ text: 'Loading' });
      steamService.getCurrentSales.mockResolvedValue(mockSales);
      salesMessageBuilder.build.mockReturnValue(mockMedia);

      await service.handleSalesCommand(mockRequest);

      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Loading', undefined);
      expect(steamService.getCurrentSales as jest.Mock).toHaveBeenCalled();
      expect(messenger.sendMediaGroup as jest.Mock).toHaveBeenCalledWith(123, mockMedia);
    });

    it('should handle empty sales', async () => {
      messages.salesLoadingMessage.mockReturnValue({ text: 'Loading' });
      steamService.getCurrentSales.mockResolvedValue([]);
      messages.salesEmptyMessage.mockReturnValue({ text: 'Empty' });

      await service.handleSalesCommand(mockRequest);

      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Empty', undefined);
    });

    it('should handle errors', async () => {
      messages.salesLoadingMessage.mockReturnValue({ text: 'Loading' });
      steamService.getCurrentSales.mockRejectedValue(new Error('Fail'));
      messages.salesErrorMessage.mockReturnValue({ text: 'Error' });

      await service.handleSalesCommand(mockRequest);

      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Error', undefined);
    });
  });

  describe('handleHelp', () => {
    it('should send help message', async () => {
      contextService.getSubscriptionContext.mockResolvedValue({ user: mockUser, activeSubscription: {} as any });
      messages.helpMessage.mockReturnValue({ text: 'Help' });

      await service.handleHelp(mockRequest);

      expect(messages.helpMessage as jest.Mock).toHaveBeenCalledWith(true, true);
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Help', undefined);
    });
  });

  describe('handleSubscribe', () => {
    it('should create subscription and confirm', async () => {
      messages.subscribeMessage.mockReturnValue({ text: 'Subscribed' });

      await service.handleSubscribe(123, mockUser, null);

      expect(subscriptionsService.createForUser as jest.Mock).toHaveBeenCalledWith(mockUser, SubscriptionType.STEAM);
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Subscribed', undefined);
    });

    it('should not create subscription if already active', async () => {
      messages.subscribeMessage.mockReturnValue({ text: 'Subscribed' });

      await service.handleSubscribe(123, mockUser, {} as any);

      expect(subscriptionsService.createForUser as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribe', () => {
    it('should deactivate subscription and confirm', async () => {
      messages.unsubscribeMessage.mockReturnValue({ text: 'Unsubscribed' });

      await service.handleUnsubscribe(123, { id: 's1' } as any, true);

      expect(subscriptionsService.deactivate as jest.Mock).toHaveBeenCalledWith('s1');
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Unsubscribed', undefined);
    });
  });

  describe('handleWishlist', () => {
    it('should send wishlist media group', async () => {
      const mockItems = [{ name: 'Item 1' }] as any;
      const mockMedia = [{ type: 'photo', media: 'img' }] as any;

      messages.wishlistLoadingMessage.mockReturnValue({ text: 'Loading' });
      steamService.getWishlistItems.mockResolvedValue(mockItems);
      wishlistMessageBuilder.build.mockReturnValue(mockMedia);

      await service.handleWishlist(123, 'steam-id');

      expect(steamService.getWishlistItems as jest.Mock).toHaveBeenCalledWith('steam-id');
      expect(messenger.sendMediaGroup as jest.Mock).toHaveBeenCalledWith(123, mockMedia);
    });

    it('should handle empty wishlist', async () => {
      messages.wishlistLoadingMessage.mockReturnValue({ text: 'Loading' });
      steamService.getWishlistItems.mockResolvedValue([]);
      messages.wishlistEmptyMessage.mockReturnValue({ text: 'Empty' });

      await service.handleWishlist(123, 'steam-id');

      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Empty', undefined);
    });

    it('should handle wishlist error', async () => {
      messages.wishlistLoadingMessage.mockReturnValue({ text: 'Loading' });
      steamService.getWishlistItems.mockRejectedValue(new Error('Fail'));
      messages.wishlistErrorMessage.mockReturnValue({ text: 'Error' });

      await service.handleWishlist(123, 'steam-id');

      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Error', undefined);
    });
  });

  describe('handleSteamIdSetup', () => {
    it('should resolve and set Steam ID', async () => {
      messages.steamIdConnectedMessage.mockReturnValue({ text: 'Connected' });

      await service.handleSteamIdSetup(123, mockUser, 'new-steam-id', false);

      expect(steamService.resolveSteamUser as jest.Mock).toHaveBeenCalledWith('new-steam-id');
      expect(usersService.setSteamId as jest.Mock).toHaveBeenCalledWith(mockUser.id, 'new-steam-id');
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Connected', undefined);
    });

    it('should handle steam resolution error', async () => {
      steamService.resolveSteamUser.mockRejectedValue(new Error('Not found'));
      messages.steamIdNotFoundMessage.mockReturnValue({ text: 'Not found' });

      await service.handleSteamIdSetup(123, mockUser, 'invalid-id', false);

      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Not found', undefined);
    });
  });

  describe('Helper send methods', () => {
    it('sendSteamIdGuide should send guide', async () => {
      messages.steamIdGuideMessage.mockReturnValue({ text: 'Guide' });
      await service.sendSteamIdGuide(123);
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Guide', undefined);
    });

    it('sendSteamIdAlreadyConnected should send message', async () => {
      messages.steamIdAlreadyConnectedMessage.mockReturnValue({ text: 'Already' });
      await service.sendSteamIdAlreadyConnected(123);
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Already', undefined);
    });

    it('sendStartRequired should send message', async () => {
      messages.startRequiredMessage.mockReturnValue({ text: 'Start msg' });
      await service.sendStartRequired(123);
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Start msg', undefined);
    });

    it('sendUnknownText should send unknown msg', async () => {
      messages.unknownTextMessage.mockReturnValue({ text: 'Unknown' });
      await service.sendUnknownText(123, true, true);
      expect(messenger.sendMessage as jest.Mock).toHaveBeenCalledWith(123, 'Unknown', undefined);
    });
  });
});
