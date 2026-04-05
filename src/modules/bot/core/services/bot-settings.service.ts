import { Injectable } from '@nestjs/common';
import type { BotRequest } from '../bot.types';
import { BotMessages } from '../../messaging/bot.messages';
import { BotResponder } from './bot-responder.service';
import type { SettingsContext, SettingsStep, SettingsStepHandler } from './settings/settings-step-handler';
import { MenuStepHandler } from './settings/menu-step.handler';
import { FrequencyStepHandler } from './settings/frequency-step.handler';
import { PlatformsStepHandler } from './settings/platforms-step.handler';

@Injectable()
export class BotSettingsService {
  private readonly sessions = new Map<string, SettingsStep>();
  private readonly stepHandlers: ReadonlyMap<SettingsStep, SettingsStepHandler>;

  constructor(
    private readonly messages: BotMessages,
    private readonly responder: BotResponder,
    menuStep: MenuStepHandler,
    frequencyStep: FrequencyStepHandler,
    platformsStep: PlatformsStepHandler,
  ) {
    this.stepHandlers = new Map<SettingsStep, SettingsStepHandler>([
      ['menu', menuStep],
      ['frequency', frequencyStep],
      ['platforms', platformsStep],
    ]);
  }

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

  async handleSettingsFlow(request: BotRequest, context: SettingsContext): Promise<boolean> {
    const key = this.getSettingsKey(request.telegramUserId);
    const step = key ? this.sessions.get(key) : null;

    if (!step || !request.text) {
      return false;
    }

    const handler = this.stepHandlers.get(step);

    if (!handler) {
      return false;
    }

    const result = await handler.handle(request.text, context);

    if (result.nextStep) {
      this.setSettingsStep(request.telegramUserId, result.nextStep);
    } else {
      this.clearSession(request.telegramUserId);
    }

    await this.responder.sendReply(context.chatId, result.reply);

    return true;
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
}
