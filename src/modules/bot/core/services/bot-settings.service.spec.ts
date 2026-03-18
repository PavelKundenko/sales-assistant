import { Test, TestingModule } from '@nestjs/testing';
import { BotSettingsService } from './bot-settings.service';
import { BOT_USER_PREFERENCES_SERVICE, type UserPreferencesServicePort } from '../../ports/bot.ports';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';
import { Platform } from '../../../../shared/enums/platform.enum';
import type { UserEntity } from '../../../users/entities/user.entity';
import { SETTINGS_FREQUENCY_BUTTON_LABEL, SETTINGS_PLATFORMS_BUTTON_LABEL } from '../bot.constants';
import { MenuStepHandler } from './settings/menu-step.handler';
import { FrequencyStepHandler } from './settings/frequency-step.handler';
import { PlatformsStepHandler } from './settings/platforms-step.handler';

describe('BotSettingsService', () => {
  let service: BotSettingsService;
  let userPreferencesService: jest.Mocked<UserPreferencesServicePort>;
  let messages: jest.Mocked<BotMessages>;
  let responder: jest.Mocked<BotResponder>;

  beforeEach(async () => {
    userPreferencesService = {
      updateUpdateFrequency: jest.fn(),
      updatePlatforms: jest.fn(),
      updateSalesReceivedAt: jest.fn(),
      updateWishlistReceivedAt: jest.fn(),
    } as unknown as jest.Mocked<UserPreferencesServicePort>;

    messages = {
      settingsMenuMessage: jest.fn().mockReturnValue({ text: 'menu' }),
      settingsFrequencyMessage: jest.fn().mockReturnValue({ text: 'freq' }),
      settingsFrequencyUpdatedMessage: jest.fn().mockReturnValue({ text: 'freq-updated' }),
      settingsFrequencyInvalidMessage: jest.fn().mockReturnValue({ text: 'freq-invalid' }),
      settingsPlatformsMessage: jest.fn().mockReturnValue({ text: 'platforms' }),
      settingsPlatformsSavedMessage: jest.fn().mockReturnValue({ text: 'platforms-saved' }),
      settingsClosedMessage: jest.fn().mockReturnValue({ text: 'closed' }),
    } as unknown as jest.Mocked<BotMessages>;

    responder = {
      sendReply: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotSettingsService,
        MenuStepHandler,
        FrequencyStepHandler,
        PlatformsStepHandler,
        { provide: BOT_USER_PREFERENCES_SERVICE, useValue: userPreferencesService },
        { provide: BotMessages, useValue: messages },
        { provide: BotResponder, useValue: responder },
      ],
    }).compile();

    service = module.get<BotSettingsService>(BotSettingsService);
  });

  it('updates frequency after selecting value', async () => {
    const user = {
      id: 'u1',
      preferences: { salesUpdateFrequency: 3, wishlistUpdateFrequency: 3 },
    } as UserEntity;

    await service.openSettingsMenu(123, 111);

    const menuRequest = {
      chatId: 123,
      telegramUserId: 111,
      text: SETTINGS_FREQUENCY_BUTTON_LABEL,
    } as BotRequest;

    await service.handleSettingsFlow(menuRequest, { chatId: 123, user, activeSubscription: null });

    const updateRequest = {
      chatId: 123,
      telegramUserId: 111,
      text: '2',
    } as BotRequest;

    const handled = await service.handleSettingsFlow(updateRequest, { chatId: 123, user, activeSubscription: null });

    expect(handled).toBe(true);
    expect(userPreferencesService.updateUpdateFrequency).toHaveBeenCalledWith('u1', 2);
    expect(user.preferences?.salesUpdateFrequency).toBe(2);
    expect(user.preferences?.wishlistUpdateFrequency).toBe(2);
    expect(messages.settingsFrequencyUpdatedMessage).toHaveBeenCalledWith(2);
  });

  it('toggles platforms and persists selection', async () => {
    const user = {
      id: 'u2',
      preferences: { platform: [Platform.PC] },
    } as UserEntity;

    await service.openSettingsMenu(222, 333);

    const menuRequest = {
      chatId: 222,
      telegramUserId: 333,
      text: SETTINGS_PLATFORMS_BUTTON_LABEL,
    } as BotRequest;

    await service.handleSettingsFlow(menuRequest, { chatId: 222, user, activeSubscription: null });

    const toggleRequest = {
      chatId: 222,
      telegramUserId: 333,
      text: 'Mac',
    } as BotRequest;

    const handled = await service.handleSettingsFlow(toggleRequest, { chatId: 222, user, activeSubscription: null });

    expect(handled).toBe(true);
    expect(userPreferencesService.updatePlatforms).toHaveBeenCalledWith('u2', [Platform.PC, Platform.MAC]);
    expect(user.preferences?.platform).toEqual([Platform.PC, Platform.MAC]);
  });
});
