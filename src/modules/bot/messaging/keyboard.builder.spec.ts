import { Test, TestingModule } from '@nestjs/testing';
import { KeyboardBuilder } from './keyboard.builder';
import {
  START_BUTTON_LABEL,
  SALES_BUTTON_LABEL,
  SUBSCRIBE_BUTTON_LABEL,
  UNSUBSCRIBE_BUTTON_LABEL,
  CONNECT_WISHLIST_BUTTON_LABEL,
  WISHLIST_BUTTON_LABEL,
  SETTINGS_BUTTON_LABEL,
} from '../core/bot.constants';

describe('KeyboardBuilder', () => {
  let builder: KeyboardBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeyboardBuilder],
    }).compile();

    builder = module.get<KeyboardBuilder>(KeyboardBuilder);
  });

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('buildMainKeyboard', () => {
    it('should return keyboard for non-subscribed user without Steam ID', () => {
      const result = builder.buildMainKeyboard({ isSubscribed: false, hasSteamId: false });

      expect(result).toEqual([
        [START_BUTTON_LABEL],
        [SALES_BUTTON_LABEL, SUBSCRIBE_BUTTON_LABEL],
        [CONNECT_WISHLIST_BUTTON_LABEL],
        [SETTINGS_BUTTON_LABEL],
      ]);
    });

    it('should return keyboard for subscribed user without Steam ID', () => {
      const result = builder.buildMainKeyboard({ isSubscribed: true, hasSteamId: false });

      expect(result).toEqual([
        [START_BUTTON_LABEL],
        [SALES_BUTTON_LABEL, UNSUBSCRIBE_BUTTON_LABEL],
        [CONNECT_WISHLIST_BUTTON_LABEL],
        [SETTINGS_BUTTON_LABEL],
      ]);
    });

    it('should return keyboard for non-subscribed user with Steam ID', () => {
      const result = builder.buildMainKeyboard({ isSubscribed: false, hasSteamId: true });

      expect(result).toEqual([
        [START_BUTTON_LABEL],
        [SALES_BUTTON_LABEL, SUBSCRIBE_BUTTON_LABEL],
        [WISHLIST_BUTTON_LABEL],
        [SETTINGS_BUTTON_LABEL],
      ]);
    });

    it('should return keyboard for subscribed user with Steam ID', () => {
      const result = builder.buildMainKeyboard({ isSubscribed: true, hasSteamId: true });

      expect(result).toEqual([
        [START_BUTTON_LABEL],
        [SALES_BUTTON_LABEL, UNSUBSCRIBE_BUTTON_LABEL],
        [WISHLIST_BUTTON_LABEL],
        [SETTINGS_BUTTON_LABEL],
      ]);
    });
  });
});
