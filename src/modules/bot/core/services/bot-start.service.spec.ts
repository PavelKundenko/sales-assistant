import { Test, TestingModule } from '@nestjs/testing';
import { BotStartService } from './bot-start.service';
import {
  BOT_SUBSCRIPTIONS_SERVICE,
  BOT_USERS_SERVICE,
  type SubscriptionsServicePort,
  type UsersServicePort,
} from '../../ports/bot.ports';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';
import { SubscriptionType } from '../../../subscriptions/entities/subscription.entity';

describe('BotStartService', () => {
  let service: BotStartService;
  let usersService: jest.Mocked<UsersServicePort>;
  let subscriptionsService: jest.Mocked<SubscriptionsServicePort>;
  let messages: jest.Mocked<BotMessages>;
  let responder: jest.Mocked<BotResponder>;

  beforeEach(async () => {
    usersService = {
      createOrGet: jest.fn(),
    } as unknown as jest.Mocked<UsersServicePort>;

    subscriptionsService = {
      findActiveByUser: jest.fn(),
    } as unknown as jest.Mocked<SubscriptionsServicePort>;

    messages = {
      startMessage: jest.fn().mockReturnValue({ text: 'start' }),
    } as unknown as jest.Mocked<BotMessages>;

    responder = {
      sendReply: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotStartService,
        { provide: BOT_USERS_SERVICE, useValue: usersService },
        { provide: BOT_SUBSCRIPTIONS_SERVICE, useValue: subscriptionsService },
        { provide: BotMessages, useValue: messages },
        { provide: BotResponder, useValue: responder },
      ],
    }).compile();

    service = module.get<BotStartService>(BotStartService);
  });

  it('returns early when ids are missing', async () => {
    const request = { chatId: null, telegramUserId: null } as BotRequest;

    await service.handleStart(request);

    expect(usersService.createOrGet).not.toHaveBeenCalled();
  });

  it('creates user and sends start message', async () => {
    const user = { id: 'u1', steamId: 'steam-id' } as any;
    usersService.createOrGet.mockResolvedValue([user, true]);
    subscriptionsService.findActiveByUser.mockResolvedValue([{ type: SubscriptionType.STEAM } as any]);

    const request = { chatId: 123, telegramUserId: 456, telegramUsername: 'alice' } as BotRequest;

    await service.handleStart(request);

    expect(usersService.createOrGet).toHaveBeenCalledWith('456', 'alice');
    expect(messages.startMessage).toHaveBeenCalledWith(true, true, true);
    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'start' });
  });
});
