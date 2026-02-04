import { Inject, Injectable } from '@nestjs/common';
import type { BotMessageOptions } from '../core/bot.types';
import { BOT_KEYBOARD_BUILDER, type KeyboardBuilderPort } from '../ports/bot.ports';
import { Platform } from '../../users/entities/user-preferences.entity';

export type BotReply = {
  text: string;
  options?: BotMessageOptions;
};

@Injectable()
export class BotMessages {
  constructor(
    @Inject(BOT_KEYBOARD_BUILDER)
    private readonly keyboardBuilder: KeyboardBuilderPort,
  ) {}

  startMessage(created: boolean, isSubscribed: boolean, hasSteamId: boolean): BotReply {
    const text = created
      ? 'Вітаю! Я твій помічник зі знижок у Steam. Використай кнопку нижче або команду /sales, щоб отримати актуальні знижки!'
      : 'З поверненням! Я твій помічник зі знижок у Steam. Використай кнопку нижче або команду /sales, щоб отримати актуальні знижки!';

    return {
      text,
      options: {
        keyboard: this.buildMainKeyboard(isSubscribed, hasSteamId),
      },
    };
  }

  helpMessage(isSubscribed: boolean, hasSteamId: boolean): BotReply {
    return {
      text:
        'Доступні команди:\n' +
        '/start - Запустити бота\n' +
        '/sales - Отримати актуальні знижки\n' +
        '/wishlist - Переглянути список бажаного\n' +
        '/setup_wishlist - Налаштувати Steam ID\n' +
        '/settings - Налаштування\n' +
        '/help - Показати це повідомлення\n\n' +
        'Щоб підключити Steam ID, ви також можете просто надіслати його в повідомленні (17 цифр).',
      options: {
        keyboard: this.buildMainKeyboard(isSubscribed, hasSteamId),
      },
    };
  }

  startRequiredMessage(): BotReply {
    return {
      text: 'Будь ласка, спочатку запустіть бота командою /start.',
      options: {
        keyboard: this.buildMainKeyboard(false, false),
      },
    };
  }

  salesLoadingMessage(): BotReply {
    return { text: 'Завантажую актуальні знижки в Steam...' };
  }

  salesEmptyMessage(): BotReply {
    return { text: 'На даний момент знижок не знайдено.' };
  }

  salesErrorMessage(): BotReply {
    return { text: 'Не вдалося завантажити знижки Steam. Будь ласка, спробуйте пізніше.' };
  }

  subscribeMessage(hasSteamId: boolean): BotReply {
    return {
      text: 'Ви підписалися на оновлення знижок Steam, я буду сповіщати вас про нові знижки кожного дня.',
      options: {
        keyboard: this.buildMainKeyboard(true, hasSteamId),
      },
    };
  }

  unsubscribeMessage(hasSteamId: boolean): BotReply {
    return {
      text: 'Ви відписалися від оновлень знижок Steam.',
      options: {
        keyboard: this.buildMainKeyboard(false, hasSteamId),
      },
    };
  }

  wishlistLoadingMessage(): BotReply {
    return { text: 'Завантажую ваш список бажаного...' };
  }

  wishlistEmptyMessage(): BotReply {
    return { text: 'Ваш список бажаного порожній.' };
  }

  wishlistSummaryOptions(isSubscribed: boolean): BotMessageOptions {
    return {
      keyboard: this.buildMainKeyboard(isSubscribed, true),
      parseMode: 'HTML',
      disableWebPagePreview: true,
    };
  }

  wishlistErrorMessage(): BotReply {
    return { text: 'Не вдалося завантажити список бажаного Steam. Будь ласка, спробуйте пізніше.' };
  }

  steamIdGuideMessage(): BotReply {
    return {
      text:
        'Щоб підключити ваш список бажаного, надішліть ваш Steam ID (це число з 17 цифр).\n\n' +
        'Як знайти свій Steam ID:\n' +
        "1. Натисніть на свій аватар або ім'я профілю у правому верхньому куті.\n" +
        '2. Оберіть "Про акаунт" (Account details).\n' +
        '3. Ваш Steam ID буде вказано зверху, під вашим логіном (наприклад: 76561198038514569).\n\n' +
        'Просто надішліть це 17-значне число у відповідь на це повідомлення.',
    };
  }

  steamIdAlreadyConnectedMessage(): BotReply {
    return { text: 'Ваш Steam ID вже підключено.' };
  }

  steamIdConnectedMessage(isSubscribed: boolean): BotReply {
    return {
      text: 'Готово! Steam ID підключено. Тепер я зможу показувати знижки з вашого списку бажаного.',
      options: {
        keyboard: this.buildMainKeyboard(isSubscribed, true),
      },
    };
  }

  steamIdNotFoundMessage(): BotReply {
    return {
      text: 'Не вдалося знайти користувача за цим Steam ID. Перевірте, що ви ввели правильний Steam ID, і спробуйте ще раз.',
    };
  }

  unknownTextMessage(isSubscribed: boolean, hasSteamId: boolean): BotReply {
    return {
      text: 'Будь ласка, натисніть кнопку "Знижки Steam" або введіть /sales.',
      options: {
        keyboard: this.buildMainKeyboard(isSubscribed, hasSteamId),
      },
    };
  }

  settingsMenuMessage(): BotReply {
    return {
      text: 'Налаштування: оберіть, що змінити.',
      options: {
        keyboard: this.buildSettingsMenuKeyboard(),
      },
    };
  }

  settingsFrequencyMessage(currentFrequency: number): BotReply {
    return {
      text: `Оберіть частоту оновлень (1-7 днів).\nПоточна частота: кожні ${currentFrequency} дн.`,
      options: {
        keyboard: this.buildFrequencyKeyboard(),
      },
    };
  }

  settingsFrequencyUpdatedMessage(frequency: number): BotReply {
    return {
      text: `Частоту оновлень змінено на ${frequency} дн.`,
      options: {
        keyboard: this.buildSettingsMenuKeyboard(),
      },
    };
  }

  settingsFrequencyInvalidMessage(): BotReply {
    return {
      text: 'Оберіть число від 1 до 7.',
      options: {
        keyboard: this.buildFrequencyKeyboard(),
      },
    };
  }

  settingsPlatformsMessage(selected: Platform[]): BotReply {
    return {
      text: 'Оберіть платформи. Натискайте, щоб увімкнути або вимкнути.',
      options: {
        keyboard: this.buildPlatformsKeyboard(selected),
      },
    };
  }

  settingsPlatformsSavedMessage(): BotReply {
    return {
      text: 'Платформи збережено.',
      options: {
        keyboard: this.buildSettingsMenuKeyboard(),
      },
    };
  }

  settingsClosedMessage(isSubscribed: boolean, hasSteamId: boolean): BotReply {
    return {
      text: 'Налаштування закрито.',
      options: {
        keyboard: this.buildMainKeyboard(isSubscribed, hasSteamId),
      },
    };
  }

  private buildMainKeyboard(isSubscribed: boolean, hasSteamId: boolean): string[][] {
    return this.keyboardBuilder.buildMainKeyboard({ isSubscribed, hasSteamId });
  }

  private buildSettingsMenuKeyboard(): string[][] {
    return this.keyboardBuilder.buildSettingsMenuKeyboard();
  }

  private buildFrequencyKeyboard(): string[][] {
    return this.keyboardBuilder.buildFrequencyKeyboard();
  }

  private buildPlatformsKeyboard(selected: Platform[]): string[][] {
    return this.keyboardBuilder.buildPlatformsKeyboard(selected);
  }
}
