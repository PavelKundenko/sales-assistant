import { Injectable } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { SteamService } from '../steam/steam.service';
import { SalesMessageBuilder } from './sales-message.builder';
import { UsersService } from '../users/users.service';
import {
  SALES_BUTTON_LABEL,
  START_BUTTON_LABEL,
  SUBSCRIBE_BUTTON_LABEL,
  UNSUBSCRIBE_BUTTON_LABEL,
} from './bot.constants';
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
      ? [[START_BUTTON_LABEL], [SALES_BUTTON_LABEL, UNSUBSCRIBE_BUTTON_LABEL]]
      : [[START_BUTTON_LABEL], [SALES_BUTTON_LABEL, SUBSCRIBE_BUTTON_LABEL]];

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
      ? 'Вітаю! Я твій помічник зі знижок у Steam. Використай кнопку нижче або команду /sales, щоб отримати актуальні знижки!'
      : 'З поверненням! Я твій помічник зі знижок у Steam. Використай кнопку нижче або команду /sales, щоб отримати актуальні знижки!';

    await context.reply(message, this.buildKeyboard(isSubscribed));
  }

  async handleSalesCommand(context: Context): Promise<void> {
    await context.reply('Завантажую актуальні знижки в Steam...');

    try {
      const sales = await this.steamService.getCurrentSales();

      if (sales.length === 0) {
        await context.reply('На даний момент знижок не знайдено.');

        return;
      }

      const mediaGroup = this.salesMessageBuilder.buildTopSalesMessage(sales);

      await context.replyWithMediaGroup(mediaGroup);
    } catch {
      await context.reply('Не вдалося завантажити знижки Steam. Будь ласка, спробуйте пізніше.');
    }
  }

  async handleHelp(context: Context): Promise<void> {
    const { activeSubscription } = await this.getSubscriptionContext(context.from?.id);

    await context.reply(
      'Доступні команди:\n/start - Запустити бота\n/help - Показати це повідомлення\n/sales - Отримати актуальні знижки\n\nТакож ви можете натиснути кнопку нижче.',
      this.buildKeyboard(Boolean(activeSubscription)),
    );
  }

  async handleText(context: Context): Promise<void> {
    if (!context.message || !('text' in context.message)) {
      return;
    }

    const telegramId = context.from?.id;

    if (context.message.text === START_BUTTON_LABEL) {
      await this.handleStart(context);

      return;
    }

    if (context.message.text === SALES_BUTTON_LABEL) {
      await this.handleSalesCommand(context);

      return;
    }

    const { user, activeSubscription } = await this.getSubscriptionContext(telegramId);

    if (!user) {
      await context.reply('Будь ласка, спочатку запустіть бота командою /start.', this.buildKeyboard(false));

      return;
    }

    if (context.message.text === SUBSCRIBE_BUTTON_LABEL) {
      if (!activeSubscription) {
        await this.subscriptionsService.createForUser(user, SubscriptionType.STEAM);
      }

      await context.reply(
        'Ви підписалися на оновлення знижок Steam, я буду сповіщати вас про нові знижки кожного дня.',
        this.buildKeyboard(true),
      );

      return;
    }

    if (context.message.text === UNSUBSCRIBE_BUTTON_LABEL) {
      if (activeSubscription) {
        await this.subscriptionsService.deactivate(activeSubscription.id);
      }

      await context.reply('Ви відписалися від оновлень знижок Steam.', this.buildKeyboard(false));

      return;
    }

    await context.reply(
      'Будь ласка, натисніть кнопку "Знижки Steam" або введіть /sales.',
      this.buildKeyboard(Boolean(activeSubscription)),
    );
  }
}
