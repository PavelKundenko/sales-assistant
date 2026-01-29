import { Injectable } from '@nestjs/common';
import {
  START_BUTTON_LABEL,
  SALES_BUTTON_LABEL,
  SUBSCRIBE_BUTTON_LABEL,
  UNSUBSCRIBE_BUTTON_LABEL,
  CONNECT_WISHLIST_BUTTON_LABEL,
  WISHLIST_BUTTON_LABEL,
} from './bot.constants';
import type { BotKeyboard, BuildKeyboardParams } from './bot.types';

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
    ];
  }
}
