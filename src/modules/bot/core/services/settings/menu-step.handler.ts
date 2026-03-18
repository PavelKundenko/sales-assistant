import { Injectable } from '@nestjs/common';
import {
  SETTINGS_BACK_BUTTON_LABEL,
  SETTINGS_FREQUENCY_BUTTON_LABEL,
  SETTINGS_PLATFORMS_BUTTON_LABEL,
} from '../../bot.constants';
import { BotMessages } from '../../../messaging/bot.messages';
import { Platform } from '../../../../../shared/enums/platform.enum';
import type { SettingsContext, SettingsStepHandler, StepResult } from './settings-step-handler';

@Injectable()
export class MenuStepHandler implements SettingsStepHandler {
  private readonly defaultPlatforms = [Platform.PC, Platform.MAC, Platform.STEAM_DECK];

  constructor(private readonly messages: BotMessages) {}

  handle(text: string, context: SettingsContext): StepResult {
    if (text === SETTINGS_FREQUENCY_BUTTON_LABEL) {
      const currentFrequency = context.user.preferences?.salesUpdateFrequency ?? 1;

      return {
        reply: this.messages.settingsFrequencyMessage(currentFrequency),
        nextStep: 'frequency',
      };
    }

    if (text === SETTINGS_PLATFORMS_BUTTON_LABEL) {
      const platforms = context.user.preferences?.platform ?? this.defaultPlatforms;

      return {
        reply: this.messages.settingsPlatformsMessage(platforms),
        nextStep: 'platforms',
      };
    }

    if (text === SETTINGS_BACK_BUTTON_LABEL) {
      return {
        reply: this.messages.settingsClosedMessage(Boolean(context.activeSubscription), Boolean(context.user.steamId)),
        nextStep: null,
      };
    }

    return {
      reply: this.messages.settingsMenuMessage(),
      nextStep: 'menu',
    };
  }
}
