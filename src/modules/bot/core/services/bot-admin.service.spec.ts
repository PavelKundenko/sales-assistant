import { Test, TestingModule } from '@nestjs/testing';
import { BotAdminService } from './bot-admin.service';
import { BOT_USERS_SERVICE, type UsersServicePort } from '../../ports/bot.ports';
import { BotResponder } from './bot-responder.service';
import { telegramConfig } from '../../../../configuration';
import type { BotRequest } from '../bot.types';

describe('BotAdminService', () => {
  let service: BotAdminService;
  let usersService: jest.Mocked<UsersServicePort>;
  let responder: jest.Mocked<BotResponder>;

  beforeEach(async () => {
    usersService = {
      findAllActive: jest.fn(),
    } as unknown as jest.Mocked<UsersServicePort>;

    responder = {
      sendMessage: jest.fn(),
      sendMediaGroup: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotAdminService,
        { provide: BOT_USERS_SERVICE, useValue: usersService },
        { provide: BotResponder, useValue: responder },
        { provide: telegramConfig.KEY, useValue: { adminId: 123 } },
      ],
    }).compile();

    service = module.get<BotAdminService>(BotAdminService);
  });

  it('ignores requests from non-admin', async () => {
    const request = { chatId: 999, text: '/post Hello' } as unknown as BotRequest;

    await service.handlePostCommand(request);

    expect(responder.sendMessage).not.toHaveBeenCalled();
    expect(usersService.findAllActive).not.toHaveBeenCalled();
  });

  it('prompts when post message is empty', async () => {
    const request = { chatId: 123, text: '/post   ' } as unknown as BotRequest;

    await service.handlePostCommand(request);

    expect(responder.sendMessage).toHaveBeenCalledWith(123, 'Please provide a message to send.');
    expect(usersService.findAllActive).not.toHaveBeenCalled();
  });

  it('broadcasts message to active users', async () => {
    usersService.findAllActive.mockResolvedValue([{ telegramId: '111' } as any, { telegramId: '222' } as any]);

    const request = { chatId: 123, text: '/post Hello' } as unknown as BotRequest;

    await service.handlePostCommand(request);

    expect(responder.sendMessage).toHaveBeenCalledWith(111, 'Hello');
    expect(responder.sendMessage).toHaveBeenCalledWith(222, 'Hello');
    expect(responder.sendMessage).toHaveBeenCalledWith(123, 'Message sent to 2 active users.');
  });

  it('broadcasts media with caption', async () => {
    usersService.findAllActive.mockResolvedValue([{ telegramId: '111' } as any]);

    const request = {
      chatId: 123,
      text: '/post Promo',
      media: [{ type: 'photo', media: 'file-id' }],
    } as unknown as BotRequest;

    await service.handlePostCommand(request);

    expect(responder.sendMediaGroup).toHaveBeenCalledWith(111, [{ type: 'photo', media: 'file-id', caption: 'Promo' }]);
  });
});
