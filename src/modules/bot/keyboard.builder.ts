import { Injectable } from '@nestjs/common';
import {
  START_BUTTON_LABEL,
  SALES_BUTTON_LABEL,
  SUBSCRIBE_BUTTON_LABEL,
  UNSUBSCRIBE_BUTTON_LABEL,
} from './bot.constants';
import type { BotKeyboard, BuildKeyboardParams } from './bot.types';

@Injectable()
export class KeyboardBuilder {
  buildMainKeyboard(params: BuildKeyboardParams): BotKeyboard {
    return params.isSubscribed
      ? [[START_BUTTON_LABEL], [SALES_BUTTON_LABEL, UNSUBSCRIBE_BUTTON_LABEL]]
      : [[START_BUTTON_LABEL], [SALES_BUTTON_LABEL, SUBSCRIBE_BUTTON_LABEL]];
  }
}
