import { Test, TestingModule } from '@nestjs/testing';
import { BotHelpService } from './bot-help.service';
import { BotContextService } from '../bot-context.service';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';

describe('BotHelpService', () => {
  let service: BotHelpService;
  let contextService: jest.Mocked<BotContextService>;
  let messages: jest.Mocked<BotMessages>;
  let responder: jest.Mocked<BotResponder>;

  beforeEach(async () => {
    contextService = {
      getSubscriptionContext: jest.fn(),
    } as unknown as jest.Mocked<BotContextService>;

    messages = {
      helpMessage: jest.fn().mockReturnValue({ text: 'help' }),
    } as unknown as jest.Mocked<BotMessages>;

    responder = {
      sendReply: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotHelpService,
        { provide: BotContextService, useValue: contextService },
        { provide: BotMessages, useValue: messages },
        { provide: BotResponder, useValue: responder },
      ],
    }).compile();

    service = module.get<BotHelpService>(BotHelpService);
  });

  it('returns early when chat id is missing', async () => {
    await service.handleHelp({ chatId: null } as BotRequest);

    expect(contextService.getSubscriptionContext).not.toHaveBeenCalled();
  });

  it('sends help message with context flags', async () => {
    contextService.getSubscriptionContext.mockResolvedValue({
      user: { steamId: 'steam-id' } as any,
      activeSubscription: { id: 'sub' } as any,
    });

    await service.handleHelp({ chatId: 123, telegramUserId: 456 } as BotRequest);

    expect(messages.helpMessage).toHaveBeenCalledWith(true, true);
    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'help' });
  });
});
