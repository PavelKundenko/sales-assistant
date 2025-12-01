import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserStatus } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findByTelegramId(telegramId: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { telegramId },
    });
  }

  async createOrGet(telegramId: string): Promise<[UserEntity, created: boolean]> {
    const existing = await this.findByTelegramId(telegramId);

    if (existing) {
      if (existing.status === UserStatus.INACTIVE) {
        existing.status = UserStatus.ACTIVE;
        existing.deactivatedAt = null;

        const saved = await this.repository.save(existing);

        return [saved, true];
      }

      return [existing, false];
    }

    const entity = this.repository.create({
      telegramId,
      status: UserStatus.ACTIVE,
    });

    const saved = await this.repository.save(entity);

    return [saved, true];
  }

  async removeByTelegramId(telegramId: string): Promise<void> {
    await this.repository.update({ telegramId }, { status: UserStatus.INACTIVE, deactivatedAt: new Date() });
  }
}
