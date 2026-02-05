import { Test, TestingModule } from '@nestjs/testing';
import { BotResponder } from './bot-responder.service';
import { BOT_MESSENGER, type BotMessenger, type BotMessageSequence } from '../bot.types';
import type { BotReply } from '../../messaging/bot.messages';

describe('BotResponder', () => {
  let service: BotResponder;
  let messenger: jest.Mocked<BotMessenger>;

  beforeEach(async () => {
    messenger = {
      sendMessage: jest.fn(),
      sendMediaGroup: jest.fn(),
      sendMessageSequence: jest.fn(),
      setMyCommands: jest.fn(),
    } as unknown as jest.Mocked<BotMessenger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [BotResponder, { provide: BOT_MESSENGER, useValue: messenger }],
    }).compile();

    service = module.get<BotResponder>(BotResponder);
  });

  it('sends reply via messenger', async () => {
    const reply: BotReply = { text: 'hello', options: { parseMode: 'HTML' } };

    await service.sendReply(123, reply);

    expect(messenger.sendMessage).toHaveBeenCalledWith(123, 'hello', reply.options);
  });

  it('sends message sequence via messenger', async () => {
    const sequence: BotMessageSequence = [{ type: 'text', text: 'msg' }];

    await service.sendMessageSequence(123, sequence);

    expect(messenger.sendMessageSequence).toHaveBeenCalledWith(123, sequence);
  });

  it('sends media group via messenger', async () => {
    const media = [{ type: 'photo', media: 'file-id' }] as const;

    await service.sendMediaGroup(123, media);

    expect(messenger.sendMediaGroup).toHaveBeenCalledWith(123, media);
  });

  it('sets bot commands via messenger', async () => {
    const commands = [{ command: 'start', description: 'Start' }];

    await service.setMyCommands(commands);

    expect(messenger.setMyCommands).toHaveBeenCalledWith(commands);
  });
});
