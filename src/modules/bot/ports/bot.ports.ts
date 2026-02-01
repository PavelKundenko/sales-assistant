import type { SteamSaleDto } from '../../steam/dto/steam-sale.dto';
import type { SteamWishlistItemDto } from '../../steam/dto/steam-wishlist-item.dto';
import type { SteamPlayerResponse } from '../../steam/interfaces/steam-user.interface';
import type { SubscriptionEntity, SubscriptionType } from '../../subscriptions/entities/subscription.entity';
import type { UserEntity } from '../../users/entities/user.entity';
import type { BotKeyboard, BotMediaItem, BuildKeyboardParams } from '../core/bot.types';

export const BOT_STEAM_SERVICE = Symbol('BOT_STEAM_SERVICE');
export const BOT_USERS_SERVICE = Symbol('BOT_USERS_SERVICE');
export const BOT_SUBSCRIPTIONS_SERVICE = Symbol('BOT_SUBSCRIPTIONS_SERVICE');
export const BOT_SALES_MESSAGE_BUILDER = Symbol('BOT_SALES_MESSAGE_BUILDER');
export const BOT_WISHLIST_MESSAGE_BUILDER = Symbol('BOT_WISHLIST_MESSAGE_BUILDER');
export const BOT_KEYBOARD_BUILDER = Symbol('BOT_KEYBOARD_BUILDER');

export type SteamMessageBuilderOptions = {
  intro?: string;
};

export type SalesMessageBuilderOptions = SteamMessageBuilderOptions & {
  limit?: number;
};

export type WishlistMessageBuilderOptions = SteamMessageBuilderOptions;

export interface SteamServicePort {
  getCurrentSales(): Promise<SteamSaleDto[]>;
  getWishlistItems(steamId: string): Promise<SteamWishlistItemDto[]>;
  resolveSteamUser(steamId: string): Promise<SteamPlayerResponse>;
}

export interface UsersServicePort {
  findByTelegramId(telegramId: string): Promise<UserEntity | null>;
  createOrGet(telegramId: string): Promise<[UserEntity, created: boolean]>;
  setSteamId(userId: string, steamId: string): Promise<void>;
  getUsersWithSteamId(): Promise<UserEntity[]>;
  findAllActive(): Promise<UserEntity[]>;
}

export interface SubscriptionsServicePort {
  createForUser(user: UserEntity, type: SubscriptionType): Promise<SubscriptionEntity>;
  deactivate(id: string): Promise<void>;
  findActiveByUser(userId: string): Promise<SubscriptionEntity[]>;
  findActiveByType(type: SubscriptionType): Promise<SubscriptionEntity[]>;
}

export interface SalesMessageBuilderPort {
  build(sales: SteamSaleDto[], options?: SalesMessageBuilderOptions): BotMediaItem[];
}

export interface WishlistMessageBuilderPort {
  build(items: SteamWishlistItemDto[], options?: WishlistMessageBuilderOptions): BotMediaItem[];
}

export interface KeyboardBuilderPort {
  buildMainKeyboard(params: BuildKeyboardParams): BotKeyboard;
}
