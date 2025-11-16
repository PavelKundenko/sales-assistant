import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { SteamService } from '../steam/steam.service';
import { SalesMessageBuilder } from './sales-message.builder';

@Injectable()
export class BotService {
  constructor(
    private readonly steamService: SteamService,
    private readonly salesMessageBuilder: SalesMessageBuilder,
  ) {}

  async handleSalesCommand(context: Context): Promise<void> {
    await context.reply('Fetching current Steam sales...');

    try {
      const sales = await this.steamService.getCurrentSales();

      if (sales.length === 0) {
        await context.reply('No sales found at the moment.');
        return;
      }

      const { caption, photoUrl } = this.salesMessageBuilder.buildTopSalesMessage(sales);

      await context.replyWithPhoto(photoUrl, {
        caption,
        parse_mode: 'HTML',
      });
    } catch {
      await context.reply('Failed to fetch Steam sales. Please try again later.');
    }
  }
}
