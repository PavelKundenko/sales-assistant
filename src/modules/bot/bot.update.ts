import { Update, Ctx, Start, Help, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  constructor(private readonly botService: BotService) {}

  @Start()
  async start(@Ctx() context: Context) {
    await this.botService.handleStart(context);
  }

  @Help()
  async help(@Ctx() context: Context) {
    await this.botService.handleHelp(context);
  }

  @Command('sales')
  async onSalesCommand(@Ctx() context: Context) {
    await this.botService.handleSalesCommand(context);
  }

  @On('text')
  async onText(@Ctx() context: Context) {
    await this.botService.handleText(context);
  }
}
