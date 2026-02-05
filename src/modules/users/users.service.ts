import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { UserEntity, UserStatus } from './entities/user.entity';
import { UserPreferencesEntity } from './entities/user-preferences.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findByTelegramId(telegramId: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { telegramId },
      relations: { preferences: true },
    });
  }

  async createOrGet(telegramId: string, telegramUsername?: string | null): Promise<[UserEntity, created: boolean]> {
    const existing = await this.findByTelegramId(telegramId);

    if (existing) {
      let shouldSave = false;
      let created = false;

      if (existing.status === UserStatus.INACTIVE) {
        existing.status = UserStatus.ACTIVE;
        existing.deactivatedAt = null;

        created = true;
        shouldSave = true;
      }

      if (!existing.preferences) {
        existing.preferences = new UserPreferencesEntity();
        shouldSave = true;
      }

      if (telegramUsername && existing.telegramUsername !== telegramUsername) {
        existing.telegramUsername = telegramUsername;
        shouldSave = true;
      }

      if (shouldSave) {
        const saved = await this.repository.save(existing);

        return [saved, created];
      }

      return [existing, created];
    }

    const entity = this.repository.create({
      telegramId,
      telegramUsername: telegramUsername ?? null,
      status: UserStatus.ACTIVE,
      preferences: new UserPreferencesEntity(),
    });

    const saved = await this.repository.save(entity);

    return [saved, true];
  }

  async removeByTelegramId(telegramId: string): Promise<void> {
    await this.repository.update({ telegramId }, { status: UserStatus.INACTIVE, deactivatedAt: new Date() });
  }

  async setSteamId(userId: string, steamId: string): Promise<void> {
    await this.repository.update({ id: userId }, { steamId });
  }

  async updateTelegramUsername(userId: string, telegramUsername: string): Promise<void> {
    await this.repository.update({ id: userId }, { telegramUsername });
  }

  async getUsersWithSteamId(): Promise<UserEntity[]> {
    return this.repository.find({
      where: { steamId: Not(IsNull()) },
      relations: { preferences: true },
    });
  }

  async findAllActive(): Promise<UserEntity[]> {
    return this.repository.find({ where: { status: UserStatus.ACTIVE } });
  }

  async updateSalesReceivedAt(userId: string): Promise<void> {
    const user = await this.repository.findOne({
      where: { id: userId },
      relations: { preferences: true },
    });

    if (user?.preferences) {
      user.preferences.salesUpdateReceivedAt = new Date();

      await this.repository.save(user);
    }
  }

  async updateWishlistReceivedAt(userId: string): Promise<void> {
    const user = await this.repository.findOne({
      where: { id: userId },
      relations: { preferences: true },
    });

    if (user?.preferences) {
      user.preferences.wishlistUpdateReceivedAt = new Date();

      await this.repository.save(user);
    }
  }

  async updateUpdateFrequency(userId: string, frequency: number): Promise<void> {
    const user = await this.repository.findOne({
      where: { id: userId },
      relations: { preferences: true },
    });

    if (!user) {
      return;
    }

    if (!user.preferences) {
      user.preferences = new UserPreferencesEntity();
    }

    user.preferences.salesUpdateFrequency = frequency;
    user.preferences.wishlistUpdateFrequency = frequency;

    await this.repository.save(user);
  }

  async updatePlatforms(userId: string, platforms: UserPreferencesEntity['platform']): Promise<void> {
    const user = await this.repository.findOne({
      where: { id: userId },
      relations: { preferences: true },
    });

    if (!user) {
      return;
    }

    if (!user.preferences) {
      user.preferences = new UserPreferencesEntity();
    }

    user.preferences.platform = platforms;

    await this.repository.save(user);
  }
}
