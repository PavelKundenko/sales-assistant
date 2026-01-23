import { Update, Ctx, Start, Help, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';
import type { BotRequest } from './bot.types';

@Update()
export class BotUpdate {
  constructor(private readonly botService: BotService) {}

  private buildRequest(context: Context): BotRequest {
    const text =
      context.message && 'text' in context.message && typeof context.message.text === 'string'
        ? context.message.text
        : undefined;

    return {
      chatId: context.chat?.id ?? null,
      telegramUserId: context.from?.id ?? null,
      text,
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

  @On('text')
  async onText(@Ctx() context: Context) {
    await this.botService.handleText(this.buildRequest(context));
  }
}
