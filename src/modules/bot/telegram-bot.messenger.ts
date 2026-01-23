import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { InputMediaPhoto } from 'telegraf/types';
import type { BotChatId, BotMediaItem, BotMessageOptions, BotMessenger } from './bot.types';

@Injectable()
export class TelegramBotMessenger implements BotMessenger {
  constructor(@InjectBot() private readonly bot: Telegraf<Context>) {}

  async sendMessage(chatId: BotChatId, text: string, options?: BotMessageOptions): Promise<void> {
    const extra = options?.keyboard ? Markup.keyboard(options.keyboard).resize() : undefined;
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
}
