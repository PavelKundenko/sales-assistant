import { MessageBuilder } from './message.builder';

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
}
