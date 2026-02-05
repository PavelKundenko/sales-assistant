import { Test, TestingModule } from '@nestjs/testing';
import { BotWishlistService } from './bot-wishlist.service';
import {
  BOT_STEAM_SERVICE,
  BOT_USERS_SERVICE,
  BOT_WISHLIST_MESSAGE_BUILDER,
  type SteamServicePort,
  type UsersServicePort,
  type WishlistMessageBuilderPort,
} from '../../ports/bot.ports';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { BotRequest } from '../bot.types';

describe('BotWishlistService', () => {
  let service: BotWishlistService;
  let steamService: jest.Mocked<SteamServicePort>;
  let usersService: jest.Mocked<UsersServicePort>;
  let wishlistMessageBuilder: jest.Mocked<WishlistMessageBuilderPort>;
  let messages: jest.Mocked<BotMessages>;
  let responder: jest.Mocked<BotResponder>;

  beforeEach(async () => {
    steamService = {
      getWishlistItems: jest.fn(),
      resolveSteamUser: jest.fn(),
    } as unknown as jest.Mocked<SteamServicePort>;

    usersService = {
      setSteamId: jest.fn(),
    } as unknown as jest.Mocked<UsersServicePort>;

    wishlistMessageBuilder = {
      build: jest.fn(),
    } as unknown as jest.Mocked<WishlistMessageBuilderPort>;

    messages = {
      steamIdGuideMessage: jest.fn().mockReturnValue({ text: 'guide' }),
      wishlistLoadingMessage: jest.fn().mockReturnValue({ text: 'loading' }),
      wishlistEmptyMessage: jest.fn().mockReturnValue({ text: 'empty' }),
      wishlistErrorMessage: jest.fn().mockReturnValue({ text: 'error' }),
      steamIdConnectedMessage: jest.fn().mockReturnValue({ text: 'connected' }),
      steamIdNotFoundMessage: jest.fn().mockReturnValue({ text: 'not-found' }),
      steamIdAlreadyConnectedMessage: jest.fn().mockReturnValue({ text: 'already' }),
    } as unknown as jest.Mocked<BotMessages>;

    responder = {
      sendReply: jest.fn(),
      sendMessageSequence: jest.fn(),
    } as unknown as jest.Mocked<BotResponder>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotWishlistService,
        { provide: BOT_STEAM_SERVICE, useValue: steamService },
        { provide: BOT_USERS_SERVICE, useValue: usersService },
        { provide: BOT_WISHLIST_MESSAGE_BUILDER, useValue: wishlistMessageBuilder },
        { provide: BotMessages, useValue: messages },
        { provide: BotResponder, useValue: responder },
      ],
    }).compile();

    service = module.get<BotWishlistService>(BotWishlistService);
  });

  it('prompts for steam id when missing', async () => {
    await service.handleWishlistCommand({ chatId: 123, user: { id: 'u1' } as any });

    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'guide' });
  });

  it('sends wishlist sequence when items exist', async () => {
    const user = { id: 'u1', steamId: 'steam-id' } as any;
    const items = [{ name: 'Item' }];
    const sequence = [{ type: 'text', text: 'wishlist' }];

    steamService.getWishlistItems.mockResolvedValue(items as any);
    wishlistMessageBuilder.build.mockReturnValue(sequence as any);

    await service.handleWishlistCommand({ chatId: 123, user });

    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'loading' });
    expect(responder.sendMessageSequence).toHaveBeenCalledWith(123, sequence);
  });

  it('validates setup command input', async () => {
    const request = { chatId: 123, telegramUserId: 1, text: '/setup_wishlist abc' } as BotRequest;
    const context = { chatId: 123, user: { id: 'u1' } as any, activeSubscription: null };

    await service.handleSetupWishlistCommand(request, context);

    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'guide' });
  });

  it('connects steam id successfully', async () => {
    steamService.resolveSteamUser.mockResolvedValue({} as never);

    await service.handleSteamIdSetup(123, { id: 'u1', telegramId: '11' } as any, '76561198000000000', true);

    expect(steamService.resolveSteamUser).toHaveBeenCalledWith('76561198000000000');
    expect(usersService.setSteamId).toHaveBeenCalledWith('u1', '76561198000000000');
    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'connected' });
  });

  it('handles steam id lookup failure', async () => {
    steamService.resolveSteamUser.mockRejectedValue(new Error('not found'));

    await service.handleSteamIdSetup(123, { id: 'u1', telegramId: '11' } as any, '76561198000000000', true);

    expect(responder.sendReply).toHaveBeenCalledWith(123, { text: 'not-found' });
  });
});
