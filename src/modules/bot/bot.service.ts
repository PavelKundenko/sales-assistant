import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { BOT_MESSENGER, type BotMessenger, type BotRequest } from './bot.types';
import { KeyboardBuilder } from './keyboard.builder';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @Inject(BOT_MESSENGER)
    private readonly messenger: BotMessenger,
    private readonly keyboardBuilder: KeyboardBuilder,
    private readonly steamService: SteamService,
    private readonly salesMessageBuilder: SalesMessageBuilder,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

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

  async handleStart(request: BotRequest): Promise<void> {
    const telegramId = request.telegramUserId;
    const chatId = request.chatId;

    if (!telegramId || !chatId) {
      return;
    }

    const [user, created] = await this.usersService.createOrGet(telegramId.toString());
    const activeSubscriptions = await this.subscriptionsService.findActiveByUser(user.id);
    const isSubscribed = activeSubscriptions.some((subscription) => subscription.type === SubscriptionType.STEAM);

    const message = created
      ? 'Вітаю! Я твій помічник зі знижок у Steam. Використай кнопку нижче або команду /sales, щоб отримати актуальні знижки!'
      : 'З поверненням! Я твій помічник зі знижок у Steam. Використай кнопку нижче або команду /sales, щоб отримати актуальні знижки!';

    await this.messenger.sendMessage(chatId, message, {
      keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed }),
    });
  }

  async handleSalesCommand(request: BotRequest): Promise<void> {
    const chatId = request.chatId;
    const telegramId = request.telegramUserId;

    if (!chatId) {
      return;
    }

    await this.messenger.sendMessage(chatId, 'Завантажую актуальні знижки в Steam...');

    try {
      const sales = await this.steamService.getCurrentSales();

      if (sales.length === 0) {
        await this.messenger.sendMessage(chatId, 'На даний момент знижок не знайдено.');

        return;
      }

      const mediaGroup = this.salesMessageBuilder.buildTopSalesMessage(sales);

      await this.messenger.sendMediaGroup(chatId, mediaGroup);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const trace = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to handle /sales for ${telegramId ?? 'unknown'}: ${reason}`, trace);
      await this.messenger.sendMessage(chatId, 'Не вдалося завантажити знижки Steam. Будь ласка, спробуйте пізніше.');
    }
  }

  async handleHelp(request: BotRequest): Promise<void> {
    const chatId = request.chatId;

    if (!chatId) {
      return;
    }

    const { activeSubscription } = await this.getSubscriptionContext(request.telegramUserId ?? undefined);

    await this.messenger.sendMessage(
      chatId,
      'Доступні команди:\n/start - Запустити бота\n/help - Показати це повідомлення\n/sales - Отримати актуальні знижки\n\nТакож ви можете натиснути кнопку нижче.',
      { keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed: Boolean(activeSubscription) }) },
    );
  }

  private async handleSubscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    user: UserEntity,
    activeSubscription: SubscriptionEntity | null,
  ): Promise<void> {
    if (!activeSubscription) {
      await this.subscriptionsService.createForUser(user, SubscriptionType.STEAM);
    }

    await this.messenger.sendMessage(
      chatId,
      'Ви підписалися на оновлення знижок Steam, я буду сповіщати вас про нові знижки кожного дня.',
      { keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed: true }) },
    );
  }

  private async handleUnsubscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    activeSubscription: SubscriptionEntity | null,
  ): Promise<void> {
    if (activeSubscription) {
      await this.subscriptionsService.deactivate(activeSubscription.id);
    }

    await this.messenger.sendMessage(chatId, 'Ви відписалися від оновлень знижок Steam.', {
      keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed: false }),
    });
  }

  async handleText(request: BotRequest): Promise<void> {
    if (!request.text) {
      return;
    }

    const chatId = request.chatId;

    if (!chatId) {
      return;
    }

    const telegramId = request.telegramUserId;

    if (request.text === START_BUTTON_LABEL) {
      await this.handleStart(request);

      return;
    }

    if (request.text === SALES_BUTTON_LABEL) {
      await this.handleSalesCommand(request);

      return;
    }

    const { user, activeSubscription } = await this.getSubscriptionContext(telegramId ?? undefined);

    if (!user) {
      await this.messenger.sendMessage(chatId, 'Будь ласка, спочатку запустіть бота командою /start.', {
        keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed: false }),
      });

      return;
    }

    if (request.text === SUBSCRIBE_BUTTON_LABEL) {
      await this.handleSubscribe(chatId, user, activeSubscription);

      return;
    }

    if (request.text === UNSUBSCRIBE_BUTTON_LABEL) {
      await this.handleUnsubscribe(chatId, activeSubscription);

      return;
    }

    await this.messenger.sendMessage(chatId, 'Будь ласка, натисніть кнопк у "Знижки Steam" або введіть /sales.', {
      keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed: Boolean(activeSubscription) }),
    });
  }
}
