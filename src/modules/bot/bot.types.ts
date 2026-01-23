export type BotChatId = number | string;

export type BotKeyboard = string[][];

export interface BotMessageOptions {
  keyboard?: BotKeyboard;
}

export type BuildKeyboardParams = {
  isSubscribed: boolean;
};

export type BotMediaItem = {
  type: 'photo';
  media: string;
  caption?: string;
  parseMode?: 'HTML';
};

export interface BotMessenger {
  sendMessage(chatId: BotChatId, text: string, options?: BotMessageOptions): Promise<void>;
  sendMediaGroup(chatId: BotChatId, media: BotMediaItem[]): Promise<void>;
}

export type BotRequest = {
  chatId: BotChatId | null;
  telegramUserId: number | null;
  text?: string;
};

export const BOT_MESSENGER = Symbol('BOT_MESSENGER');
