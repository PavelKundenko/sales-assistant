import { Injectable } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { SteamService } from '../steam/steam.service';
import { SalesMessageBuilder } from './sales-message.builder';
import { UsersService } from '../users/users.service';
import { SALES_BUTTON_LABEL, SUBSCRIBE_BUTTON_LABEL, UNSUBSCRIBE_BUTTON_LABEL } from './bot.constants';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionEntity, SubscriptionType } from '../subscriptions/entities/subscription.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class BotService {
  constructor(
    private readonly steamService: SteamService,
    private readonly salesMessageBuilder: SalesMessageBuilder,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  private buildKeyboard(isSubscribed: boolean) {
    const buttons = isSubscribed
      ? [[SALES_BUTTON_LABEL], [UNSUBSCRIBE_BUTTON_LABEL]]
      : [[SALES_BUTTON_LABEL], [SUBSCRIBE_BUTTON_LABEL]];

    return Markup.keyboard(buttons).resize();
  }

  private async getSubscriptionContext(
    telegramId?: number,
  ): Promise<{ user: UserEntity | null; activeSubscription: SubscriptionEntity | null }> {
    if (!telegramId) {
      return { user: null, activeSubscription: null };
    }

    const user = await this.usersService.findByTelegramId(telegramId.toString());

    if (!user) {
      return { user: null, activeSubscription: null };
    }

    const activeSubscriptions = await this.subscriptionsService.findActiveByUser(user.id);
    const activeSubscription =
      activeSubscriptions.find((subscription) => subscription.type === SubscriptionType.STEAM) ?? null;

    return { user, activeSubscription };
  }

  async handleStart(context: Context): Promise<void> {
    const telegramId = context.from?.id;

    if (!telegramId) {
      return;
    }

    const [user, created] = await this.usersService.createOrGet(telegramId.toString());
    const activeSubscriptions = await this.subscriptionsService.findActiveByUser(user.id);
    const isSubscribed = activeSubscriptions.some((subscription) => subscription.type === SubscriptionType.STEAM);

    const message = created
      ? 'Welcome! I am your steam sales assistant bot. Use the button below or /sales to get current Steam sales!'
      : 'Welcome back! I am your steam sales assistant bot. Use the button below or /sales to get current Steam sales!';

    await context.reply(message, this.buildKeyboard(isSubscribed));
  }

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

  async handleHelp(context: Context): Promise<void> {
    const { activeSubscription } = await this.getSubscriptionContext(context.from?.id);

    await context.reply(
      'Available commands:\n/start - Start the bot\n/help - Show this help message\n/sales - Get current Steam sales\n\nYou can also tap the button below.',
      this.buildKeyboard(Boolean(activeSubscription)),
    );
  }

  async handleText(context: Context): Promise<void> {
    if (!context.message || !('text' in context.message)) {
      return;
    }

    const telegramId = context.from?.id;

    if (context.message.text === SALES_BUTTON_LABEL) {
      await this.handleSalesCommand(context);

      return;
    }

    const { user, activeSubscription } = await this.getSubscriptionContext(telegramId);

    if (!user) {
      await context.reply('Please start the bot with /start first.', this.buildKeyboard(false));

      return;
    }

    if (context.message.text === SUBSCRIBE_BUTTON_LABEL) {
      if (!activeSubscription) {
        await this.subscriptionsService.createForUser(user, SubscriptionType.STEAM);
      }

      await context.reply('You are subscribed to Steam sales updates.', this.buildKeyboard(true));

      return;
    }

    if (context.message.text === UNSUBSCRIBE_BUTTON_LABEL) {
      if (activeSubscription) {
        await this.subscriptionsService.deactivate(activeSubscription.id);
      }

      await context.reply('You have unsubscribed from Steam sales updates.', this.buildKeyboard(false));

      return;
    }

    await context.reply(
      'Please tap the Steam Sales button or type /sales.',
      this.buildKeyboard(Boolean(activeSubscription)),
    );
  }
}
