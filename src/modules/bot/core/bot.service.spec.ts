/* eslint-disable @typescript-eslint/unbound-method */
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { BotResponder } from './services/bot-responder.service';
import { BotSettingsService } from './services/bot-settings.service';
import { BotSalesService } from './services/bot-sales.service';
import { BotWishlistService } from './services/bot-wishlist.service';
import { BotSubscriptionService } from './services/bot-subscription.service';
import { BotAdminService } from './services/bot-admin.service';
import { BotStartService } from './services/bot-start.service';
import { BotHelpService } from './services/bot-help.service';
import { BotRequestGuard } from './services/bot-request.guard';
import type { BotRequest } from './bot.types';
import { BotMessages } from '../messaging/bot.messages';
import { UserEntity } from '../../users/entities/user.entity';

describe('BotService', () => {
  let service: BotService;
  let messages: jest.Mocked<BotMessages>;
  let responder: jest.Mocked<BotResponder>;
  let settingsService: jest.Mocked<BotSettingsService>;
  let salesService: jest.Mocked<BotSalesService>;
  let wishlistService: jest.Mocked<BotWishlistService>;
  let subscriptionService: jest.Mocked<BotSubscriptionService>;
  let adminService: jest.Mocked<BotAdminService>;
  let startService: jest.Mocked<BotStartService>;
  let helpService: jest.Mocked<BotHelpService>;
  let requestGuard: jest.Mocked<BotRequestGuard>;

  beforeEach(async () => {
    messages = {
      startMessage: jest.fn().mockReturnValue({ text: 'start' }),
      salesLoadingMessage: jest.fn().mockReturnValue({ text: 'loading' }),
      salesEmptyMessage: jest.fn().mockReturnValue({ text: 'empty' }),
      salesErrorMessage: jest.fn().mockReturnValue({ text: 'error' }),
      helpMessage: jest.fn().mockReturnValue({ text: 'help' }),
      subscribeMessage: jest.fn().mockReturnValue({ text: 'subscribe' }),
      unsubscribeMessage: jest.fn().mockReturnValue({ text: 'unsubscribe' }),
      wishlistLoadingMessage: jest.fn().mockReturnValue({ text: 'loading' }),
      wishlistEmptyMessage: jest.fn().mockReturnValue({ text: 'empty' }),
      wishlistErrorMessage: jest.fn().mockReturnValue({ text: 'error' }),
      wishlistSummaryOptions: jest.fn().mockReturnValue({ text: 'summary' }),
      steamIdGuideMessage: jest.fn().mockReturnValue({ text: 'guide' }),
      steamIdAlreadyConnectedMessage: jest.fn().mockReturnValue({ text: 'already-connected' }),
      steamIdConnectedMessage: jest.fn().mockReturnValue({ text: 'connected' }),
      steamIdNotFoundMessage: jest.fn().mockReturnValue({ text: 'not-found' }),
      startRequiredMessage: jest.fn().mockReturnValue({ text: 'start-required' }),
      unknownTextMessage: jest.fn().mockReturnValue({ text: 'unknown' }),
      settingsMenuMessage: jest.fn().mockReturnValue({ text: 'settings-menu' }),
      settingsFrequencyMessage: jest.fn().mockReturnValue({ text: 'settings-frequency' }),
      settingsFrequencyUpdatedMessage: jest.fn().mockReturnValue({ text: 'settings-frequency-updated' }),
      settingsFrequencyInvalidMessage: jest.fn().mockReturnValue({ text: 'settings-frequency-invalid' }),
      settingsPlatformsMessage: jest.fn().mockReturnValue({ text: 'settings-platforms' }),
      settingsPlatformsSavedMessage: jest.fn().mockReturnValue({ text: 'settings-platforms-saved' }),
      settingsClosedMessage: jest.fn().mockReturnValue({ text: 'settings-closed' }),
    } as unknown as jest.Mocked<BotMessages>;

    responder = {
      sendReply: jest.fn(),
      sendMessage: jest.fn(),
      sendMessageSequence: jest.fn(),
      setMyCommands: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    settingsService = {
      clearSession: jest.fn(),
      openSettingsMenu: jest.fn(),
      handleSettingsFlow: jest.fn(),
    } as unknown as jest.Mocked<BotSettingsService>;

    salesService = {
      handleSalesCommand: jest.fn(),
    } as unknown as jest.Mocked<BotSalesService>;

    wishlistService = {
      handleWishlistCommand: jest.fn(),
      handleConnectWishlistCommand: jest.fn(),
      handleSetupWishlistCommand: jest.fn(),
      tryHandleSteamIdFromText: jest.fn(),
      handleSteamIdSetup: jest.fn(),
    } as unknown as jest.Mocked<BotWishlistService>;

    subscriptionService = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<BotSubscriptionService>;

    adminService = {
      handlePostCommand: jest.fn(),
    } as unknown as jest.Mocked<BotAdminService>;

    startService = {
      handleStart: jest.fn(),
    } as unknown as jest.Mocked<BotStartService>;

    helpService = {
      handleHelp: jest.fn(),
    } as unknown as jest.Mocked<BotHelpService>;

    requestGuard = {
      requireContext: jest.fn().mockResolvedValue({ chatId: 123, user: mockUser, activeSubscription: null }),
    } as unknown as jest.Mocked<BotRequestGuard>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: BotResponder, useValue: responder },
        { provide: BotSettingsService, useValue: settingsService },
        { provide: BotSalesService, useValue: salesService },
        { provide: BotWishlistService, useValue: wishlistService },
        { provide: BotSubscriptionService, useValue: subscriptionService },
        { provide: BotAdminService, useValue: adminService },
        { provide: BotStartService, useValue: startService },
        { provide: BotHelpService, useValue: helpService },
        { provide: BotRequestGuard, useValue: requestGuard },
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
  const mockRequest: BotRequest = { chatId: 123, telegramUserId: 123, telegramUsername: 'alice', text: '/start' };

  describe('handleStart', () => {
    it('should create user and send start message', async () => {
      await service.handleStart(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(startService.handleStart).toHaveBeenCalledWith(mockRequest);
    });

    it('should return early if telegramUserId is missing', async () => {
      await service.handleStart({ ...mockRequest, telegramUserId: null });
      expect(startService.handleStart).toHaveBeenCalledWith({ ...mockRequest, telegramUserId: null });
    });
  });

  describe('handleSalesCommand', () => {
    it('should send sales media group', async () => {
      await service.handleSalesCommand(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(salesService.handleSalesCommand).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle empty sales', async () => {
      await service.handleSalesCommand(mockRequest);

      expect(salesService.handleSalesCommand).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle errors', async () => {
      await service.handleSalesCommand(mockRequest);

      expect(salesService.handleSalesCommand).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('handleHelp', () => {
    it('should send help message', async () => {
      await service.handleHelp(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(helpService.handleHelp).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('handleSettingsCommand', () => {
    it('should send settings menu message', async () => {
      await service.handleSettingsCommand(mockRequest);

      expect(requestGuard.requireContext).toHaveBeenCalledWith(mockRequest);
      expect(settingsService.openSettingsMenu).toHaveBeenCalledWith(123, 123);
    });
  });

  describe('handleSubscribe', () => {
    it('should create subscription and confirm', async () => {
      await service.handleSubscribe(123, mockUser, null);

      expect(subscriptionService.subscribe).toHaveBeenCalledWith(123, mockUser, null);
    });

    it('should not create subscription if already active', async () => {
      await service.handleSubscribe(123, mockUser, {} as any);

      expect(subscriptionService.subscribe).toHaveBeenCalledWith(123, mockUser, {} as any);
    });
  });

  describe('handleUnsubscribe', () => {
    it('should deactivate subscription and confirm', async () => {
      await service.handleUnsubscribe(123, { id: 's1' } as any, true);

      expect(subscriptionService.unsubscribe).toHaveBeenCalledWith(123, { id: 's1' } as any, true);
    });
  });

  describe('handlePostCommand', () => {
    it('should send broadcast message to all active users', async () => {
      await service.handlePostCommand({ chatId: 123, text: '/post Hello World' } as BotRequest);

      expect(adminService.handlePostCommand).toHaveBeenCalledWith({ chatId: 123, text: '/post Hello World' });
    });

    it('should ignore if not admin', async () => {
      await service.handlePostCommand({ chatId: 999, text: '/post Hello' } as BotRequest);

      expect(adminService.handlePostCommand).toHaveBeenCalledWith({ chatId: 999, text: '/post Hello' });
    });

    it('should prompt for message if empty', async () => {
      await service.handlePostCommand({ chatId: 123, text: '/post   ' } as BotRequest);

      expect(adminService.handlePostCommand).toHaveBeenCalledWith({ chatId: 123, text: '/post   ' });
    });
  });

  describe('handleWishlistCommand', () => {
    it('should send wishlist media group', async () => {
      await service.handleWishlistCommand(mockRequest);

      expect(requestGuard.requireContext).toHaveBeenCalledWith(mockRequest);
      expect(wishlistService.handleWishlistCommand).toHaveBeenCalledWith({
        chatId: 123,
        user: mockUser,
        activeSubscription: null,
      });
    });

    it('should handle empty wishlist', async () => {
      await service.handleWishlistCommand(mockRequest);

      expect(wishlistService.handleWishlistCommand).toHaveBeenCalled();
    });

    it('should handle wishlist error', async () => {
      await service.handleWishlistCommand(mockRequest);

      expect(wishlistService.handleWishlistCommand).toHaveBeenCalled();
    });
  });

  describe('handleSteamIdSetup', () => {
    it('should resolve and set Steam ID', async () => {
      await service.handleSteamIdSetup(123, mockUser, 'new-steam-id', false);

      expect(wishlistService.handleSteamIdSetup).toHaveBeenCalledWith(123, mockUser, 'new-steam-id', false);
    });

    it('should handle steam resolution error', async () => {
      await service.handleSteamIdSetup(123, mockUser, 'invalid-id', false);

      expect(wishlistService.handleSteamIdSetup).toHaveBeenCalledWith(123, mockUser, 'invalid-id', false);
    });
  });

  describe('Helper send methods', () => {
    it('sendUnknownText should send unknown msg', async () => {
      messages.unknownTextMessage.mockReturnValue({ text: 'Unknown' });
      await service.sendUnknownText(123, true, true);
      expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'Unknown' });
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should set bot commands', async () => {
      await service.onApplicationBootstrap();

      expect(responder.setMyCommands).toHaveBeenCalledWith([
        { command: 'start', description: 'Початок роботи' },
        { command: 'sales', description: '🔥 Актуальні знижки' },
        { command: 'wishlist', description: '📋 Список бажаного' },
        { command: 'setup_wishlist', description: "🔗 Прив'язати Steam ID" },
        { command: 'settings', description: '⚙️ Налаштування' },
        { command: 'help', description: 'ℹ️ Довідка' },
      ]);
    });
  });
});
