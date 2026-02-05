import { Injectable } from '@nestjs/common';
import {
  START_BUTTON_LABEL,
  SALES_BUTTON_LABEL,
  SUBSCRIBE_BUTTON_LABEL,
  UNSUBSCRIBE_BUTTON_LABEL,
  CONNECT_WISHLIST_BUTTON_LABEL,
  WISHLIST_BUTTON_LABEL,
  SETTINGS_BUTTON_LABEL,
  SETTINGS_FREQUENCY_BUTTON_LABEL,
  SETTINGS_PLATFORMS_BUTTON_LABEL,
  SETTINGS_BACK_BUTTON_LABEL,
  SETTINGS_DONE_BUTTON_LABEL,
} from '../core/bot.constants';
import type { BotKeyboard, BuildKeyboardParams } from '../core/bot.types';
import { Platform } from '../../users/entities/user-preferences.entity';

@Injectable()
export class KeyboardBuilder {
  buildMainKeyboard(params: BuildKeyboardParams): BotKeyboard {
    const subscriptionRow = params.isSubscribed
      ? [SALES_BUTTON_LABEL, UNSUBSCRIBE_BUTTON_LABEL]
      : [SALES_BUTTON_LABEL, SUBSCRIBE_BUTTON_LABEL];
    const wishlistRow = params.hasSteamId ? [WISHLIST_BUTTON_LABEL] : [];
    const connectRow = params.hasSteamId ? [] : [CONNECT_WISHLIST_BUTTON_LABEL];

    return [
      [START_BUTTON_LABEL],
      subscriptionRow,
      ...(wishlistRow.length ? [wishlistRow] : []),
      ...(connectRow.length ? [connectRow] : []),
      [SETTINGS_BUTTON_LABEL],
    ];
  }

  buildSettingsMenuKeyboard(): BotKeyboard {
    return [
      [SETTINGS_FREQUENCY_BUTTON_LABEL],
      [SETTINGS_PLATFORMS_BUTTON_LABEL],
      [SETTINGS_BACK_BUTTON_LABEL],
    ];
  }

  buildFrequencyKeyboard(): BotKeyboard {
    return [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7'],
      [SETTINGS_BACK_BUTTON_LABEL],
    ];
  }

  buildPlatformsKeyboard(selected: Platform[]): BotKeyboard {
    const labels = this.buildPlatformLabels(selected);

    return [
      [labels[Platform.PC]],
      [labels[Platform.MAC]],
      [labels[Platform.STEAM_DECK]],
      [SETTINGS_DONE_BUTTON_LABEL, SETTINGS_BACK_BUTTON_LABEL],
    ];
  }

  private buildPlatformLabels(selected: Platform[]): Record<Platform, string> {
    return {
      [Platform.PC]: `${selected.includes(Platform.PC) ? '✅' : '⬜️'} PC`,
      [Platform.MAC]: `${selected.includes(Platform.MAC) ? '✅' : '⬜️'} Mac`,
      [Platform.STEAM_DECK]: `${selected.includes(Platform.STEAM_DECK) ? '✅' : '⬜️'} Steam Deck`,
    };
  }
}
