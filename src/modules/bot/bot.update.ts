import { Update, Ctx, Start, Help, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  constructor(private readonly botService: BotService) {}

  @Start()
  async start(@Ctx() context: Context) {
    await context.reply('Welcome! I am your steam sales assistant bot. Use /sales to get current Steam sales!');
  }

  @Help()
  async help(@Ctx() context: Context) {
    await context.reply(
      'Available commands:\n/start - Start the bot\n/help - Show this help message\n/sales - Get current Steam sales',
    );
  }

  @Command('sales')
  async onSalesCommand(@Ctx() context: Context) {
    await this.botService.handleSalesCommand(context);
  }
}
