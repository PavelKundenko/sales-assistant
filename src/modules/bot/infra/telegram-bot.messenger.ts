import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { InputMediaPhoto } from 'telegraf/types';
import type {
  BotChatId,
  BotCommand,
  BotMediaItem,
  BotMessageOptions,
  BotMessenger,
  BotMessageSequence,
} from '../core/bot.types';

@Injectable()
export class TelegramBotMessenger implements BotMessenger {
  private readonly logger = new Logger(TelegramBotMessenger.name);

  constructor(@InjectBot() private readonly bot: Telegraf<Context>) {}

  async sendMessage(chatId: BotChatId, text: string, options?: BotMessageOptions): Promise<void> {
    const extra: {
      reply_markup?: ReturnType<typeof Markup.keyboard>['reply_markup'];
      parse_mode?: 'HTML';
      disable_web_page_preview?: boolean;
    } = {};

    if (options?.keyboard) {
      extra.reply_markup = Markup.keyboard(options.keyboard).resize().reply_markup;
    }

    if (options?.parseMode) {
      extra.parse_mode = options.parseMode;
    }

    if (options?.disableWebPagePreview !== undefined) {
      extra.disable_web_page_preview = options.disableWebPagePreview;
    }

    await this.bot.telegram.sendMessage(chatId, text, extra);
  }

  async sendMediaGroup(chatId: BotChatId, media: BotMediaItem[]): Promise<void> {
    const mediaGroup: InputMediaPhoto[] = media.map((item) => {
      const entry: InputMediaPhoto = {
        type: 'photo',
        media: item.media,
      };

      if (item.caption) {
        entry.caption = item.caption;
      }

      if (item.parseMode) {
        entry.parse_mode = item.parseMode;
      }

      return entry;
    });
    await this.bot.telegram.sendMediaGroup(chatId, mediaGroup);
  }

  async sendMessageSequence(chatId: BotChatId, sequence: BotMessageSequence): Promise<void> {
    for (const [index, message] of sequence.entries()) {
      try {
        if (message.type === 'text') {
          await this.sendMessage(chatId, message.text, message.options);
        } else {
          await this.sendMediaGroup(chatId, message.media);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to send message sequence item ${index + 1}/${sequence.length} to ${chatId}: ${reason}`,
        );
        throw error;
      }
    }
  }

  async setMyCommands(commands: BotCommand[]): Promise<void> {
    await this.bot.telegram.setMyCommands(commands);
  }
}
