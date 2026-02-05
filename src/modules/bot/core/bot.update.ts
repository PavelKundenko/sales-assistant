import { Update, Ctx, Start, Help, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';
import { BotTextRouter } from '../routing/bot-text-router';
import type { BotRequest } from './bot.types';

@Update()
export class BotUpdate {
  constructor(
    private readonly botService: BotService,
    private readonly botTextRouter: BotTextRouter,
  ) {}

  private buildRequest(context: Context): BotRequest {
    const message = context.message;

    const text =
      message && 'text' in message && typeof message.text === 'string'
        ? message.text
        : message && 'caption' in message && typeof message.caption === 'string'
          ? message.caption
          : undefined;

    const media =
      message && 'photo' in message && Array.isArray(message.photo) && message.photo.length > 0
        ? [{ type: 'photo' as const, media: message.photo[message.photo.length - 1].file_id }]
        : undefined;

    return {
      chatId: context.chat?.id ?? null,
      telegramUserId: context.from?.id ?? null,
      telegramUsername: context.from?.username ?? null,
      text,
      media,
    };
  }

  @Start()
  async start(@Ctx() context: Context) {
    await this.botService.handleStart(this.buildRequest(context));
  }

  @Help()
  async help(@Ctx() context: Context) {
    await this.botService.handleHelp(this.buildRequest(context));
  }

  @Command('sales')
  async onSalesCommand(@Ctx() context: Context) {
    await this.botService.handleSalesCommand(this.buildRequest(context));
  }

  @Command('wishlist')
  async onWishlistCommand(@Ctx() context: Context) {
    await this.botService.handleWishlistCommand(this.buildRequest(context));
  }

  @Command('setup_wishlist')
  async onSetupWishlistCommand(@Ctx() context: Context) {
    await this.botService.handleSetupWishlistCommand(this.buildRequest(context));
  }

  @Command('settings')
  async onSettingsCommand(@Ctx() context: Context) {
    await this.botService.handleSettingsCommand(this.buildRequest(context));
  }

  @On('text')
  async onText(@Ctx() context: Context) {
    await this.botTextRouter.handleText(this.buildRequest(context));
  }

  @On('photo')
  async onPhoto(@Ctx() context: Context) {
    await this.botService.handlePostCommand(this.buildRequest(context));
  }
}
