import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { BotSalesService } from './bot-sales.service';
import { BotContextService } from '../bot-context.service';
import {
  BOT_SALES_MESSAGE_BUILDER,
  BOT_STEAM_SERVICE,
  type SalesMessageBuilderPort,
  type SteamServicePort,
} from '../../ports/bot.ports';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';
import { Platform } from '../../../users/entities/user-preferences.entity';

describe('BotSalesService', () => {
  let service: BotSalesService;
  let contextService: jest.Mocked<BotContextService>;
  let steamService: jest.Mocked<SteamServicePort>;
  let salesMessageBuilder: jest.Mocked<SalesMessageBuilderPort>;
  let messages: jest.Mocked<BotMessages>;
  let responder: jest.Mocked<BotResponder>;

  beforeEach(async () => {
    contextService = {
      getSubscriptionContext: jest.fn(),
    } as unknown as jest.Mocked<BotContextService>;

    steamService = {
      getCurrentSales: jest.fn(),
    } as unknown as jest.Mocked<SteamServicePort>;

    salesMessageBuilder = {
      build: jest.fn(),
    } as unknown as jest.Mocked<SalesMessageBuilderPort>;

    messages = {
      salesLoadingMessage: jest.fn().mockReturnValue({ text: 'loading' }),
      salesEmptyMessage: jest.fn().mockReturnValue({ text: 'empty' }),
      salesErrorMessage: jest.fn().mockReturnValue({ text: 'error' }),
    } as unknown as jest.Mocked<BotMessages>;

    responder = {
      sendReply: jest.fn(),
      sendMessageSequence: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotSalesService,
        { provide: BotContextService, useValue: contextService },
        { provide: BOT_STEAM_SERVICE, useValue: steamService },
        { provide: BOT_SALES_MESSAGE_BUILDER, useValue: salesMessageBuilder },
        { provide: BotMessages, useValue: messages },
        { provide: BotResponder, useValue: responder },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    service = module.get<BotSalesService>(BotSalesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends sales sequence when available', async () => {
    const request = { chatId: 123, telegramUserId: 999 } as BotRequest;
    const sales = [{ name: 'Game', windowsAvailable: true, macAvailable: false, linuxAvailable: false }];
    const sequence = [{ type: 'text', text: 'sales' }];

    contextService.getSubscriptionContext.mockResolvedValue({
      user: { preferences: { platform: [Platform.PC] } } as any,
      activeSubscription: null,
    });
    steamService.getCurrentSales.mockResolvedValue(sales as any);
    salesMessageBuilder.build.mockReturnValue(sequence as any);

    await service.handleSalesCommand(request);

    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'loading' });
    expect(responder.sendMessageSequence).toHaveBeenCalledWith(123, sequence);
  });

  it('sends empty message when no sales', async () => {
    const request = { chatId: 123, telegramUserId: 999 } as BotRequest;

    contextService.getSubscriptionContext.mockResolvedValue({ user: null, activeSubscription: null });
    steamService.getCurrentSales.mockResolvedValue([] as any);

    await service.handleSalesCommand(request);

    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'loading' });
    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'empty' });
  });

  it('sends error message when steam service fails', async () => {
    const request = { chatId: 123, telegramUserId: 999 } as BotRequest;

    contextService.getSubscriptionContext.mockResolvedValue({ user: null, activeSubscription: null });
    steamService.getCurrentSales.mockRejectedValue(new Error('fail'));

    await service.handleSalesCommand(request);

    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'error' });
  });
});
