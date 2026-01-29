import { Inject, Injectable, Logger } from '@nestjs/common';
import { SteamService } from '../steam/steam.service';
import { SalesMessageBuilder } from './sales-message.builder';
import { UsersService } from '../users/users.service';
import {
  SALES_BUTTON_LABEL,
  START_BUTTON_LABEL,
  SUBSCRIBE_BUTTON_LABEL,
  UNSUBSCRIBE_BUTTON_LABEL,
  CONNECT_WISHLIST_BUTTON_LABEL,
  WISHLIST_BUTTON_LABEL,
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
      keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed, hasSteamId: Boolean(user.steamId) }),
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

    const { user, activeSubscription } = await this.getSubscriptionContext(request.telegramUserId ?? undefined);

    await this.messenger.sendMessage(
      chatId,
      'Доступні команди:\n/start - Запустити бота\n/help - Показати це повідомлення\n/sales - Отримати актуальні знижки\n\nТакож ви можете натиснути кнопку нижче.',
      {
        keyboard: this.keyboardBuilder.buildMainKeyboard({
          isSubscribed: Boolean(activeSubscription),
          hasSteamId: Boolean(user?.steamId),
        }),
      },
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
      { keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed: true, hasSteamId: Boolean(user.steamId) }) },
    );
  }

  private async handleUnsubscribe(
    chatId: NonNullable<BotRequest['chatId']>,
    activeSubscription: SubscriptionEntity | null,
    hasSteamId: boolean,
  ): Promise<void> {
    if (activeSubscription) {
      await this.subscriptionsService.deactivate(activeSubscription.id);
    }

    await this.messenger.sendMessage(chatId, 'Ви відписалися від оновлень знижок Steam.', {
      keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed: false, hasSteamId }),
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
        keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed: false, hasSteamId: false }),
      });

      return;
    }

    if (request.text === SUBSCRIBE_BUTTON_LABEL) {
      await this.handleSubscribe(chatId, user, activeSubscription);

      return;
    }

    if (request.text === UNSUBSCRIBE_BUTTON_LABEL) {
      await this.handleUnsubscribe(chatId, activeSubscription, Boolean(user.steamId));

      return;
    }

    if (request.text === WISHLIST_BUTTON_LABEL) {
      if (!user.steamId) {
        await this.sendSteamIdGuide(chatId);

        return;
      }

      await this.handleWishlist(chatId, user.steamId, telegramId ?? undefined, Boolean(activeSubscription));

      return;
    }

    if (request.text === CONNECT_WISHLIST_BUTTON_LABEL) {
      if (user.steamId) {
        await this.messenger.sendMessage(chatId, 'Ваш Steam ID вже підключено.');

        return;
      }

      await this.sendSteamIdGuide(chatId);

      return;
    }

    if (!user.steamId) {
      const steamId = this.parseSteamId(request.text);

      if (steamId) {
        await this.handleSteamIdSetup(chatId, user, steamId, Boolean(activeSubscription));

        return;
      }
    }

    await this.messenger.sendMessage(chatId, 'Будь ласка, натисніть кнопку "Знижки Steam" або введіть /sales.', {
      keyboard: this.keyboardBuilder.buildMainKeyboard({
        isSubscribed: Boolean(activeSubscription),
        hasSteamId: Boolean(user.steamId),
      }),
    });
  }

  private async handleWishlist(
    chatId: NonNullable<BotRequest['chatId']>,
    steamId: string,
    telegramId?: number,
    isSubscribed = false,
  ): Promise<void> {
    await this.messenger.sendMessage(chatId, 'Завантажую ваш список бажаного...');

    try {
      const items = await this.steamService.getWishlistItems(steamId);

      if (items.length === 0) {
        await this.messenger.sendMessage(chatId, 'Ваш список бажаного порожній.');

        return;
      }

      const mediaGroup = this.salesMessageBuilder.buildWishlistMessage(items, 9);
      const textMessage = this.salesMessageBuilder.buildWishlistText(items, 9);

      await this.messenger.sendMediaGroup(chatId, mediaGroup);
      await this.messenger.sendMessage(chatId, textMessage, {
        keyboard: this.keyboardBuilder.buildMainKeyboard({
          isSubscribed,
          hasSteamId: true,
        }),
        parseMode: 'HTML',
        disableWebPagePreview: true,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const trace = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to load wishlist for ${telegramId ?? 'unknown'}: ${reason}`, trace);
      await this.messenger.sendMessage(
        chatId,
        'Не вдалося завантажити список бажаного Steam. Будь ласка, спробуйте пізніше.',
      );
    }
  }

  private async handleSteamIdSetup(
    chatId: NonNullable<BotRequest['chatId']>,
    user: UserEntity,
    steamId: string,
    isSubscribed: boolean,
  ): Promise<void> {
    try {
      await this.steamService.resolveSteamUser(steamId);
      await this.usersService.setSteamId(user.id, steamId);

      await this.messenger.sendMessage(
        chatId,
        'Готово! Steam ID підключено. Тепер я зможу показувати знижки з вашого списку бажаного.',
        { keyboard: this.keyboardBuilder.buildMainKeyboard({ isSubscribed, hasSteamId: true }) },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to connect Steam ID for user ${user.telegramId}: ${reason}`);
      await this.messenger.sendMessage(
        chatId,
        'Не вдалося знайти користувача за цим Steam ID. Перевірте, що ви ввели правильний Steam ID, і спробуйте ще раз.',
      );
    }
  }

  private async sendSteamIdGuide(chatId: NonNullable<BotRequest['chatId']>): Promise<void> {
    const guide =
      'Щоб підключити список бажаного, надішліть ваш Steam ID (17 цифр).\n' +
      'Як знайти Steam ID:\n' +
      '1) Відкрийте профіль у Steam.\n' +
      '2) Скопіюйте Steam ID зі сторінки профілю (він складається з 17 цифр).\n' +
      '3) Надішліть цей Steam ID у відповідь цьому повідомленню.';

    await this.messenger.sendMessage(chatId, guide);
  }

  private parseSteamId(text: string): string | null {
    const trimmed = text.trim();

    return /^\d{17}$/.test(trimmed) ? trimmed : null;
  }
}
