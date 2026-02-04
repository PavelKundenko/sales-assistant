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
  type: 'photo';
  media: string;
  caption?: string;
  parseMode?: 'HTML';
};

export type BotMessage =
  | {
      type: 'text';
      text: string;
      options?: BotMessageOptions;
    }
  | {
      type: 'mediaGroup';
      media: BotMediaItem[];
    };

export type BotMessageSequence = BotMessage[];

export interface BotMessenger {
  sendMessage(chatId: BotChatId, text: string, options?: BotMessageOptions): Promise<void>;
  sendMediaGroup(chatId: BotChatId, media: BotMediaItem[]): Promise<void>;
  sendMessageSequence(chatId: BotChatId, sequence: BotMessageSequence): Promise<void>;
  setMyCommands(commands: BotCommand[]): Promise<void>;
}

export type BotCommand = {
  command: string;
  description: string;
};

export type BotRequest = {
  chatId: BotChatId | null;
  telegramUserId: number | null;
  text?: string;
};

export const BOT_MESSENGER = Symbol('BOT_MESSENGER');
