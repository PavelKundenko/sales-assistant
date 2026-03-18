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
    it('should clear session and delegate to startService', async () => {
      await service.handleStart(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(startService.handleStart).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle missing telegramUserId', async () => {
      await service.handleStart({ ...mockRequest, telegramUserId: null });
      expect(startService.handleStart).toHaveBeenCalledWith({ ...mockRequest, telegramUserId: null });
    });
  });

  describe('handleSalesCommand', () => {
    it('should clear session and delegate to salesService', async () => {
      await service.handleSalesCommand(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(salesService.handleSalesCommand).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('handleHelp', () => {
    it('should clear session and delegate to helpService', async () => {
      await service.handleHelp(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(helpService.handleHelp).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('handleSettingsCommand', () => {
    it('should require context and open settings menu', async () => {
      await service.handleSettingsCommand(mockRequest);

      expect(requestGuard.requireContext).toHaveBeenCalledWith(mockRequest);
      expect(settingsService.openSettingsMenu).toHaveBeenCalledWith(123, 123);
    });
  });

  describe('handleSubscribeCommand', () => {
    it('should clear session, require context, and subscribe', async () => {
      await service.handleSubscribeCommand(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(subscriptionService.subscribe).toHaveBeenCalledWith(123, mockUser, null);
    });

    it('should return early if context is null', async () => {
      requestGuard.requireContext.mockResolvedValue(null);
      await service.handleSubscribeCommand(mockRequest);

      expect(subscriptionService.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribeCommand', () => {
    it('should clear session, require context, and unsubscribe', async () => {
      await service.handleUnsubscribeCommand(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(subscriptionService.unsubscribe).toHaveBeenCalledWith(123, null, true);
    });
  });

  describe('handlePostCommand', () => {
    it('should clear session and delegate to adminService', async () => {
      await service.handlePostCommand({ chatId: 123, text: '/post Hello World' } as BotRequest);

      expect(adminService.handlePostCommand).toHaveBeenCalledWith({ chatId: 123, text: '/post Hello World' });
    });
  });

  describe('handleWishlistCommand', () => {
    it('should clear session, require context, and delegate to wishlistService', async () => {
      await service.handleWishlistCommand(mockRequest);

      expect(settingsService.clearSession).toHaveBeenCalledWith(123);
      expect(requestGuard.requireContext).toHaveBeenCalledWith(mockRequest);
      expect(wishlistService.handleWishlistCommand).toHaveBeenCalledWith({
        chatId: 123,
        user: mockUser,
        activeSubscription: null,
      });
    });
  });

  describe('handleTextCommand', () => {
    it('should send unknown text message when no handler matches', async () => {
      settingsService.handleSettingsFlow.mockResolvedValue(false);
      wishlistService.tryHandleSteamIdFromText.mockResolvedValue(false);

      await service.handleTextCommand({ ...mockRequest, text: 'random text' });

      expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'unknown' });
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
