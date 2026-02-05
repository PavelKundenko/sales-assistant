export type BotChatId = number | string;

export type BotKeyboard = string[][];

export interface BotMessageOptions {
  keyboard?: BotKeyboard;
  parseMode?: 'HTML';
  disableWebPagePreview?: boolean;
}

export type BuildKeyboardParams = {
  isSubscribed: boolean;
  hasSteamId: boolean;
};

export type BotMediaItem = {
  readonly type: 'photo';
  readonly media: string;
  readonly caption?: string;
  readonly parseMode?: 'HTML';
};

export type BotMessage =
  | {
      type: 'text';
      text: string;
      options?: BotMessageOptions;
    }
  | {
      type: 'mediaGroup';
      media: readonly BotMediaItem[];
    };

export type BotMessageSequence = readonly BotMessage[];

export interface BotMessenger {
  sendMessage(chatId: BotChatId, text: string, options?: BotMessageOptions): Promise<void>;
  sendMediaGroup(chatId: BotChatId, media: readonly BotMediaItem[]): Promise<void>;
  sendMessageSequence(chatId: BotChatId, sequence: BotMessageSequence): Promise<void>;
  setMyCommands(commands: readonly BotCommand[]): Promise<void>;
}

export type BotCommand = {
  command: string;
  description: string;
};

export type BotRequest = {
  chatId: BotChatId | null;
  telegramUserId: number | null;
  telegramUsername?: string | null;
  text?: string;
  media?: readonly BotMediaItem[];
};

export const BOT_MESSENGER = Symbol('BOT_MESSENGER');
