import { Inject, Injectable } from '@nestjs/common';
import { SETTINGS_BACK_BUTTON_LABEL } from '../../bot.constants';
import { BotMessages } from '../../../messaging/bot.messages';
import { BOT_USER_PREFERENCES_SERVICE, type UserPreferencesServicePort } from '../../../ports/bot.ports';
import { UserPreferencesEntity } from '../../../../users/entities/user-preferences.entity';
import type { SettingsContext, SettingsStepHandler, StepResult } from './settings-step-handler';

@Injectable()
export class FrequencyStepHandler implements SettingsStepHandler {
  constructor(
    @Inject(BOT_USER_PREFERENCES_SERVICE)
    private readonly userPreferencesService: UserPreferencesServicePort,
    private readonly messages: BotMessages,
  ) {}

  async handle(text: string, context: SettingsContext): Promise<StepResult> {
    if (text === SETTINGS_BACK_BUTTON_LABEL) {
      return {
        reply: this.messages.settingsMenuMessage(),
        nextStep: 'menu',
      };
    }

    const frequency = Number.parseInt(text, 10);

    if (!Number.isInteger(frequency) || frequency < 1 || frequency > 7) {
      return {
        reply: this.messages.settingsFrequencyInvalidMessage(),
        nextStep: 'frequency',
      };
    }

    await this.userPreferencesService.updateUpdateFrequency(context.user.id, frequency);
    this.applyFrequencyToUser(context.user, frequency);

    return {
      reply: this.messages.settingsFrequencyUpdatedMessage(frequency),
      nextStep: 'menu',
    };
  }

  private applyFrequencyToUser(user: SettingsContext['user'], frequency: number): void {
    if (!user.preferences) {
      const preferences = new UserPreferencesEntity();
      preferences.salesUpdateFrequency = frequency;
      preferences.wishlistUpdateFrequency = frequency;
      user.preferences = preferences;

      return;
    }

    user.preferences.salesUpdateFrequency = frequency;
    user.preferences.wishlistUpdateFrequency = frequency;
  }
}
