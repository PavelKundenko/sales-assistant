import { Inject, Injectable } from '@nestjs/common';
import { SETTINGS_BACK_BUTTON_LABEL, SETTINGS_DONE_BUTTON_LABEL } from '../../bot.constants';
import { BotMessages } from '../../../messaging/bot.messages';
import { BOT_USER_PREFERENCES_SERVICE, type UserPreferencesServicePort } from '../../../ports/bot.ports';
import { Platform } from '../../../../../shared/enums/platform.enum';
import { UserPreferencesEntity } from '../../../../users/entities/user-preferences.entity';
import type { SettingsContext, SettingsStepHandler, StepResult } from './settings-step-handler';

@Injectable()
export class PlatformsStepHandler implements SettingsStepHandler {
  private readonly defaultPlatforms = [Platform.PC, Platform.MAC, Platform.STEAM_DECK];

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

    if (text === SETTINGS_DONE_BUTTON_LABEL) {
      return {
        reply: this.messages.settingsPlatformsSavedMessage(),
        nextStep: 'menu',
      };
    }

    const platform = this.parsePlatformLabel(text);

    if (!platform) {
      const platforms = this.getUserPlatforms(context.user);

      return {
        reply: this.messages.settingsPlatformsMessage(platforms),
        nextStep: 'platforms',
      };
    }

    const currentPlatforms = this.getUserPlatforms(context.user);
    const updatedPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter((item) => item !== platform)
      : [...currentPlatforms, platform];

    await this.userPreferencesService.updatePlatforms(context.user.id, updatedPlatforms);
    this.applyPlatformsToUser(context.user, updatedPlatforms);

    return {
      reply: this.messages.settingsPlatformsMessage(updatedPlatforms),
      nextStep: 'platforms',
    };
  }

  private getUserPlatforms(user: SettingsContext['user']): Platform[] {
    return user.preferences?.platform ?? this.defaultPlatforms;
  }

  private applyPlatformsToUser(user: SettingsContext['user'], platforms: Platform[]): void {
    if (!user.preferences) {
      const preferences = new UserPreferencesEntity();
      preferences.platform = platforms;
      user.preferences = preferences;

      return;
    }

    user.preferences.platform = platforms;
  }

  private parsePlatformLabel(text: string): Platform | null {
    const normalized = text.toLowerCase();

    if (normalized.includes('pc')) {
      return Platform.PC;
    }

    if (normalized.includes('mac')) {
      return Platform.MAC;
    }

    if (normalized.includes('steam deck')) {
      return Platform.STEAM_DECK;
    }

    return null;
  }
}
