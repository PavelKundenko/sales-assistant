import { Platform } from '../../../../shared/enums/platform.enum';
import { MessageBuilder } from './message.builder';

type PlatformAvailability = {
  platforms?: Platform[] | null;
  windowsAvailable?: boolean;
  macAvailable?: boolean;
  linuxAvailable?: boolean;
};

export type SteamMessageBuilderOptions = {
  intro?: string;
};

export abstract class SteamMessageBuilder<TInput extends unknown[], TOutput> extends MessageBuilder<TInput, TOutput> {
  abstract build(input: TInput, options?: SteamMessageBuilderOptions): TOutput;

  protected sanitizeUrl(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  protected escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  }

  protected formatPrice(price?: number | null): string {
    if (typeof price !== 'number') {
      return 'Н/Д';
    }

    return `₴${price.toFixed(2)}`;
  }

  protected formatPlatforms(entry: PlatformAvailability): string {
    const platforms = Array.from(new Set(this.resolvePlatforms(entry)));
    const label = platforms.length ? platforms.map((platform) => this.formatPlatformLabel(platform)).join(', ') : 'Н/Д';

    return `Платформи: ${label}`;
  }

  protected resolvePlatforms(entry: PlatformAvailability): Platform[] {
    if (Array.isArray(entry.platforms) && entry.platforms.length > 0) {
      return entry.platforms;
    }

    const platforms: Platform[] = [];

    if (entry.windowsAvailable) {
      platforms.push(Platform.PC);
    }

    if (entry.macAvailable) {
      platforms.push(Platform.MAC);
    }

    if (entry.linuxAvailable) {
      platforms.push(Platform.STEAM_DECK);
    }

    return platforms;
  }

  protected formatPlatformLabel(platform: Platform): string {
    switch (platform) {
      case Platform.PC:
        return 'PC';
      case Platform.MAC:
        return 'Mac';
      case Platform.STEAM_DECK:
        return 'Steam Deck';
      default:
        return platform;
    }
  }
}
