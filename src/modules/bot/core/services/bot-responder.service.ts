import { Inject, Injectable } from '@nestjs/common';
import type { BotReply } from '../../messaging/bot.messages';
import {
  BOT_MESSENGER,
  type BotChatId,
  type BotCommand,
  type BotMediaItem,
  type BotMessageOptions,
  type BotMessageSequence,
  type BotMessenger,
} from '../bot.types';

@Injectable()
export class BotResponder {
  constructor(
    @Inject(BOT_MESSENGER)
    private readonly messenger: BotMessenger,
  ) {}

  async sendReply(chatId: BotChatId, reply: BotReply): Promise<void> {
    await this.messenger.sendMessage(chatId, reply.text, reply.options);
  }

  async sendMessage(chatId: BotChatId, text: string, options?: BotMessageOptions): Promise<void> {
    await this.messenger.sendMessage(chatId, text, options);
  }

  async sendMessageSequence(chatId: BotChatId, sequence: BotMessageSequence): Promise<void> {
    await this.messenger.sendMessageSequence(chatId, sequence);
  }

  async sendMediaGroup(chatId: BotChatId, media: readonly BotMediaItem[]): Promise<void> {
    await this.messenger.sendMediaGroup(chatId, media);
  }

  async setMyCommands(commands: readonly BotCommand[]): Promise<void> {
    await this.messenger.setMyCommands(commands);
  }
}
