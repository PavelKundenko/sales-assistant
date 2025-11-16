import { registerAs } from '@nestjs/config';

export interface TelegramConfig {
  botToken: string;
}

export interface SteamConfig {
  apiUrl: string;
}

export const telegramConfig = registerAs(
  'telegram',
  (): TelegramConfig => ({
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  }),
);

export const steamConfig = registerAs(
  'steam',
  (): SteamConfig => ({
    apiUrl: process.env.STEAM_API_URL ?? 'https://store.steampowered.com/api',
  }),
);
