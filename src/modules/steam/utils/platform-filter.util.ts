import { Platform } from '../../../shared/enums/platform.enum';

export interface PlatformAvailable {
  macAvailable: boolean;
  windowsAvailable: boolean;
  linuxAvailable: boolean;
}

export function filterByPlatform<T extends PlatformAvailable>(items: T[], platforms: Platform[]): T[] {
  if (platforms.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const hasMac = platforms.includes(Platform.MAC) && item.macAvailable;
    const hasWindows = platforms.includes(Platform.PC) && item.windowsAvailable;
    const hasSteamDeck = platforms.includes(Platform.STEAM_DECK) && item.linuxAvailable;

    return hasMac || hasWindows || hasSteamDeck;
  });
}

export function shouldSendUpdate(lastReceivedAt: Date | null | undefined, frequencyDays: number): boolean {
  if (!lastReceivedAt) {
    return true;
  }

  const daysSinceLastUpdate = Math.floor((Date.now() - lastReceivedAt.getTime()) / (1000 * 60 * 60 * 24));

  return daysSinceLastUpdate >= frequencyDays;
}
