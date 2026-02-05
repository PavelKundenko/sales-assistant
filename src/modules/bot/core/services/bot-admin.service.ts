import { Inject, Injectable, Logger } from '@nestjs/common';
import { telegramConfig, type TelegramConfig } from '../../../../configuration';
import { BotResponder } from './bot-responder.service';
import { BOT_USERS_SERVICE, type UsersServicePort } from '../../ports/bot.ports';
import type { BotMediaItem, BotRequest } from '../bot.types';

@Injectable()
export class BotAdminService {
  private readonly logger = new Logger(BotAdminService.name);

  constructor(
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    private readonly responder: BotResponder,
    @Inject(telegramConfig.KEY)
    private readonly config: TelegramConfig,
  ) {}

  async handlePostCommand(request: BotRequest): Promise<void> {
    const chatId = request.chatId;

    if (!chatId) {
      return;
    }

    if (chatId !== this.config.adminId) {
      return;
    }

    const rawText = request.text?.trim();

    if (!rawText || !rawText.startsWith('/post')) {
      return;
    }

    const textPayload = rawText.replace('/post', '').trim();
    const media = request.media && request.media.length > 0 ? request.media : null;

    if (!textPayload && !media) {
      await this.responder.sendMessage(chatId, 'Please provide a message to send.');

      return;
    }

    const users = await this.usersService.findAllActive();

    let successCount = 0;

    for (const user of users) {
      try {
        const targetChatId = Number(user.telegramId);

        if (media) {
          const payload = textPayload ? this.applyCaption(media, textPayload) : media;
          await this.responder.sendMediaGroup(targetChatId, payload);
        } else {
          await this.responder.sendMessage(targetChatId, textPayload);
        }

        successCount++;
      } catch (error) {
        this.logger.error(`Failed to send message to user ${user.telegramId}`, error);
      }
    }

    await this.responder.sendMessage(chatId, `Message sent to ${successCount} active users.`);
  }

  private applyCaption(media: readonly BotMediaItem[], caption: string): readonly BotMediaItem[] {
    if (!media || media.length === 0) {
      return [];
    }

    const [first, ...rest] = media;

    return [{ ...first, caption }, ...rest];
  }
}
