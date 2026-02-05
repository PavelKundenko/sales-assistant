import { Test, TestingModule } from '@nestjs/testing';
import { BotRequestGuard } from './bot-request.guard';
import { BotContextService } from '../bot-context.service';
import { BOT_USERS_SERVICE, type UsersServicePort } from '../../ports/bot.ports';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';
import type { UserEntity } from '../../../users/entities/user.entity';

describe('BotRequestGuard', () => {
  let guard: BotRequestGuard;
  let contextService: jest.Mocked<BotContextService>;
  let usersService: jest.Mocked<UsersServicePort>;
  let messages: jest.Mocked<BotMessages>;
  let responder: jest.Mocked<BotResponder>;

  beforeEach(async () => {
    contextService = {
      getSubscriptionContext: jest.fn(),
    } as unknown as jest.Mocked<BotContextService>;

    usersService = {
      updateTelegramUsername: jest.fn(),
    } as unknown as jest.Mocked<UsersServicePort>;

    messages = {
      startRequiredMessage: jest.fn().mockReturnValue({ text: 'start-required' }),
    } as unknown as jest.Mocked<BotMessages>;

    responder = {
      sendReply: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotRequestGuard,
        { provide: BotContextService, useValue: contextService },
        { provide: BOT_USERS_SERVICE, useValue: usersService },
        { provide: BotMessages, useValue: messages },
        { provide: BotResponder, useValue: responder },
      ],
    }).compile();

    guard = module.get<BotRequestGuard>(BotRequestGuard);
  });

  it('returns null when chatId is missing', async () => {
    const request = { chatId: null, telegramUserId: 123 } as BotRequest;

    const result = await guard.requireContext(request);

    expect(result).toBeNull();
    expect(contextService.getSubscriptionContext).not.toHaveBeenCalled();
  });

  it('prompts /start when user is missing', async () => {
    const request = { chatId: 123, telegramUserId: 456 } as BotRequest;
    contextService.getSubscriptionContext.mockResolvedValue({ user: null, activeSubscription: null });

    const result = await guard.requireContext(request);

    expect(result).toBeNull();
    expect(messages.startRequiredMessage).toHaveBeenCalled();
    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'start-required' });
  });

  it('updates telegram username when it changes', async () => {
    const user = { id: 'u1', telegramUsername: 'old' } as UserEntity;
    const request = { chatId: 123, telegramUserId: 456, telegramUsername: 'new' } as BotRequest;
    contextService.getSubscriptionContext.mockResolvedValue({ user, activeSubscription: null });

    const result = await guard.requireContext(request);

    expect(usersService.updateTelegramUsername).toHaveBeenCalledWith('u1', 'new');
    expect(user.telegramUsername).toBe('new');
    expect(result?.user).toBe(user);
  });
});
