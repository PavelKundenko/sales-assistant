import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferencesEntity } from './entities/user-preferences.entity';
import type { Platform } from '../../shared/enums/platform.enum';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserPreferencesEntity)
    private readonly repository: Repository<UserPreferencesEntity>,
  ) {}

  async updateSalesReceivedAt(userId: string): Promise<void> {
    await this.repository.update({ user: { id: userId } }, { salesUpdateReceivedAt: new Date() });
  }

  async updateWishlistReceivedAt(userId: string): Promise<void> {
    await this.repository.update({ user: { id: userId } }, { wishlistUpdateReceivedAt: new Date() });
  }

  async updateUpdateFrequency(userId: string, frequency: number): Promise<void> {
    await this.repository.update(
      { user: { id: userId } },
      { salesUpdateFrequency: frequency, wishlistUpdateFrequency: frequency },
    );
  }

  async updatePlatforms(userId: string, platforms: Platform[]): Promise<void> {
    await this.repository.update({ user: { id: userId } }, { platform: platforms });
  }
}
