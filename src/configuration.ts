import { registerAs } from '@nestjs/config';

export interface TelegramConfig {
  botToken: string;
  adminId: number;
}

export interface SteamConfig {
  storeUrl: string;
  webApiUrl: string;
  apiKey: string;
}

export const telegramConfig = registerAs(
  'telegram',
  (): TelegramConfig => ({
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    adminId: Number(process.env.TELEGRAM_ADMIN_ID ?? 0),
  }),
);

export const steamConfig = registerAs(
  'steam',
  (): SteamConfig => ({
    storeUrl: process.env.STEAM_STORE_API ?? 'https://store.steampowered.com/api',
    webApiUrl: process.env.STEAM_API_URL ?? 'https://api.steampowered.com',
    apiKey: process.env.STEAM_API_KEY ?? '',
  }),
);
