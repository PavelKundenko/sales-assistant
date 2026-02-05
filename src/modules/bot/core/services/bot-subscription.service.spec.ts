import { Test, TestingModule } from '@nestjs/testing';
import { BotSubscriptionService } from './bot-subscription.service';
import { BOT_SUBSCRIPTIONS_SERVICE, type SubscriptionsServicePort } from '../../ports/bot.ports';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';

describe('BotSubscriptionService', () => {
  let service: BotSubscriptionService;
  let subscriptionsService: jest.Mocked<SubscriptionsServicePort>;
  let messages: jest.Mocked<BotMessages>;
  let responder: jest.Mocked<BotResponder>;

  beforeEach(async () => {
    subscriptionsService = {
      createForUser: jest.fn(),
      deactivate: jest.fn(),
    } as unknown as jest.Mocked<SubscriptionsServicePort>;

    messages = {
      subscribeMessage: jest.fn().mockReturnValue({ text: 'subscribed' }),
      unsubscribeMessage: jest.fn().mockReturnValue({ text: 'unsubscribed' }),
    } as unknown as jest.Mocked<BotMessages>;

    responder = {
      sendReply: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotSubscriptionService,
        { provide: BOT_SUBSCRIPTIONS_SERVICE, useValue: subscriptionsService },
        { provide: BotMessages, useValue: messages },
        { provide: BotResponder, useValue: responder },
      ],
    }).compile();

    service = module.get<BotSubscriptionService>(BotSubscriptionService);
  });

  it('creates subscription when none active', async () => {
    await service.subscribe(123, { id: 'u1' } as any, null);

    expect(subscriptionsService.createForUser).toHaveBeenCalled();
    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'subscribed' });
  });

  it('does not create subscription when already active', async () => {
    await service.subscribe(123, { id: 'u1' } as any, { id: 's1' } as any);

    expect(subscriptionsService.createForUser).not.toHaveBeenCalled();
  });

  it('deactivates subscription on unsubscribe', async () => {
    await service.unsubscribe(123, { id: 's1' } as any, true);

    expect(subscriptionsService.deactivate).toHaveBeenCalledWith('s1');
    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'unsubscribed' });
  });
});
