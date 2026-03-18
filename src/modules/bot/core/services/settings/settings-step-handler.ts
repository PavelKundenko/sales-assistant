import type { BotReply } from '../../../messaging/bot.messages';
import type { GuardedContext } from '../bot-request.guard';

export type SettingsStep = 'menu' | 'frequency' | 'platforms';

export type SettingsContext = GuardedContext;

export type StepResult = {
  reply: BotReply;
  nextStep: SettingsStep | null;
};

export interface SettingsStepHandler {
  handle(text: string, context: SettingsContext): Promise<StepResult> | StepResult;
}
