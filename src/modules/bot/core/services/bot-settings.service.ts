import { Inject, Injectable } from '@nestjs/common';
import type { BotRequest } from '../bot.types';
import {
  SETTINGS_BACK_BUTTON_LABEL,
  SETTINGS_DONE_BUTTON_LABEL,
  SETTINGS_FREQUENCY_BUTTON_LABEL,
  SETTINGS_PLATFORMS_BUTTON_LABEL,
} from '../bot.constants';
import { BOT_USERS_SERVICE, type UsersServicePort } from '../../ports/bot.ports';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import { Platform, UserPreferencesEntity } from '../../../users/entities/user-preferences.entity';
import type { SubscriptionEntity } from '../../../subscriptions/entities/subscription.entity';
import type { UserEntity } from '../../../users/entities/user.entity';

type SettingsStep = 'menu' | 'frequency' | 'platforms';

@Injectable()
export class BotSettingsService {
  private readonly sessions = new Map<string, SettingsStep>();
  private readonly defaultPlatforms = [Platform.PC, Platform.MAC, Platform.STEAM_DECK];

  constructor(
    @Inject(BOT_USERS_SERVICE)
    private readonly usersService: UsersServicePort,
    private readonly messages: BotMessages,
    private readonly responder: BotResponder,
  ) {}

  async openSettingsMenu(chatId: NonNullable<BotRequest['chatId']>, telegramUserId: number | null | undefined) {
    this.setSettingsStep(telegramUserId, 'menu');
    await this.responder.sendReply(chatId, this.messages.settingsMenuMessage());
  }

  clearSession(telegramUserId: number | null | undefined): void {
    const key = this.getSettingsKey(telegramUserId);

    if (!key) {
      return;
    }

    this.sessions.delete(key);
  }

  async handleSettingsFlow(
    request: BotRequest,
    context: {
      chatId: NonNullable<BotRequest['chatId']>;
      user: UserEntity;
      activeSubscription: SubscriptionEntity | null;
    },
  ): Promise<boolean> {
    const key = this.getSettingsKey(request.telegramUserId);
    const step = key ? this.sessions.get(key) : null;

    if (!step || !request.text) {
      return false;
    }

    const text = request.text;

    if (step === 'menu') {
      if (text === SETTINGS_FREQUENCY_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'frequency');
        const currentFrequency = this.getUserFrequency(context.user);

        await this.responder.sendReply(context.chatId, this.messages.settingsFrequencyMessage(currentFrequency));

        return true;
      }

      if (text === SETTINGS_PLATFORMS_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'platforms');
        const platforms = this.getUserPlatforms(context.user);

        await this.responder.sendReply(context.chatId, this.messages.settingsPlatformsMessage(platforms));

        return true;
      }

      if (text === SETTINGS_BACK_BUTTON_LABEL) {
        this.clearSession(request.telegramUserId);

        await this.responder.sendReply(
          context.chatId,
          this.messages.settingsClosedMessage(Boolean(context.activeSubscription), Boolean(context.user.steamId)),
        );

        return true;
      }

      await this.responder.sendReply(context.chatId, this.messages.settingsMenuMessage());

      return true;
    }

    if (step === 'frequency') {
      if (text === SETTINGS_BACK_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'menu');
        await this.responder.sendReply(context.chatId, this.messages.settingsMenuMessage());

        return true;
      }

      const frequency = Number.parseInt(text, 10);

      if (!Number.isInteger(frequency) || frequency < 1 || frequency > 7) {
        await this.responder.sendReply(context.chatId, this.messages.settingsFrequencyInvalidMessage());

        return true;
      }

      await this.usersService.updateUpdateFrequency(context.user.id, frequency);
      this.applyFrequencyToUser(context.user, frequency);
      this.setSettingsStep(request.telegramUserId, 'menu');

      await this.responder.sendReply(context.chatId, this.messages.settingsFrequencyUpdatedMessage(frequency));

      return true;
    }

    if (step === 'platforms') {
      if (text === SETTINGS_BACK_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'menu');
        await this.responder.sendReply(context.chatId, this.messages.settingsMenuMessage());

        return true;
      }

      if (text === SETTINGS_DONE_BUTTON_LABEL) {
        this.setSettingsStep(request.telegramUserId, 'menu');
        await this.responder.sendReply(context.chatId, this.messages.settingsPlatformsSavedMessage());

        return true;
      }

      const platform = this.parsePlatformLabel(text);

      if (!platform) {
        const platforms = this.getUserPlatforms(context.user);
        await this.responder.sendReply(context.chatId, this.messages.settingsPlatformsMessage(platforms));

        return true;
      }

      const currentPlatforms = this.getUserPlatforms(context.user);
      const updatedPlatforms = currentPlatforms.includes(platform)
        ? currentPlatforms.filter((item) => item !== platform)
        : [...currentPlatforms, platform];

      await this.usersService.updatePlatforms(context.user.id, updatedPlatforms);
      this.applyPlatformsToUser(context.user, updatedPlatforms);

      await this.responder.sendReply(context.chatId, this.messages.settingsPlatformsMessage(updatedPlatforms));

      return true;
    }

    return false;
  }

  private getSettingsKey(telegramUserId: number | null | undefined): string | null {
    if (!telegramUserId) {
      return null;
    }

    return telegramUserId.toString();
  }

  private setSettingsStep(telegramUserId: number | null | undefined, step: SettingsStep): void {
    const key = this.getSettingsKey(telegramUserId);

    if (!key) {
      return;
    }

    this.sessions.set(key, step);
  }

  private getUserPlatforms(user: UserEntity): Platform[] {
    return user.preferences?.platform ?? this.defaultPlatforms;
  }

  private getUserFrequency(user: UserEntity): number {
    return user.preferences?.salesUpdateFrequency ?? 1;
  }

  private applyPlatformsToUser(user: UserEntity, platforms: Platform[]): void {
    if (!user.preferences) {
      const preferences = new UserPreferencesEntity();
      preferences.platform = platforms;
      user.preferences = preferences;

      return;
    }

    user.preferences.platform = platforms;
  }

  private applyFrequencyToUser(user: UserEntity, frequency: number): void {
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
