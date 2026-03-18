import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { BOT_MESSENGER, type BotMessenger, type BotMessageSequence } from '../core/bot.types';
import { BOT_USER_PREFERENCES_SERVICE, type UserPreferencesServicePort } from '../ports/bot.ports';
import { shouldSendUpdate } from '../../steam/utils/platform-filter.util';
import type { UserEntity } from '../../users/entities/user.entity';
import type { UserPreferencesEntity } from '../../users/entities/user-preferences.entity';

export type DigestRecipient = {
  user: UserEntity;
  telegramId: string;
};

export type DigestUserResult = {
  messageSequence: BotMessageSequence;
} | null;

export type DigestConfig = {
  jobName: string;
  getLastReceivedAt: (preferences: UserPreferencesEntity) => Date | null | undefined;
  getFrequency: (preferences: UserPreferencesEntity) => number;
  markSent: (userPreferencesService: UserPreferencesServicePort, userId: string) => Promise<void>;
};

@Injectable()
export class DigestJobRunner {
  constructor(
    @Inject(BOT_MESSENGER)
    private readonly messenger: BotMessenger,
    @Inject(BOT_USER_PREFERENCES_SERVICE)
    private readonly userPreferencesService: UserPreferencesServicePort,
  ) {}

  async processRecipients(
    recipients: DigestRecipient[],
    config: DigestConfig,
    processUser: (user: UserEntity) => Promise<DigestUserResult> | DigestUserResult,
    logger: Logger,
  ): Promise<void> {
    for (const recipient of recipients) {
      try {
        const preferences = recipient.user.preferences;

        if (!preferences) {
          logger.warn(`User ${recipient.user.id} has no preferences, skipping`);
          continue;
        }

        const shouldSend = shouldSendUpdate(config.getLastReceivedAt(preferences), config.getFrequency(preferences));

        if (!shouldSend) {
          logger.debug(`Skipping ${config.jobName} for user ${recipient.user.id} - frequency not met`);
          continue;
        }

        const result = await processUser(recipient.user);

        if (!result) {
          continue;
        }

        await this.messenger.sendMessageSequence(recipient.telegramId, result.messageSequence);
        await config.markSent(this.userPreferencesService, recipient.user.id);

        logger.log(`Sent ${config.jobName} to user ${recipient.user.id}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to send ${config.jobName} to user ${recipient.telegramId}: ${reason}`);
      }
    }
  }
}
