import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity, SubscriptionStatus, SubscriptionType } from './entities/subscription.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repository: Repository<SubscriptionEntity>,
  ) {}

  async createForUser(user: UserEntity, type: SubscriptionType): Promise<SubscriptionEntity> {
    const existing = await this.repository.findOne({
      where: { user: { id: user.id }, type },
      relations: ['user'],
    });

    if (existing) {
      if (existing.status === SubscriptionStatus.ACTIVE) {
        return existing;
      }

      existing.status = SubscriptionStatus.ACTIVE;

      return this.repository.save(existing);
    }

    const subscription = this.repository.create({
      user,
      type,
      status: SubscriptionStatus.ACTIVE,
    });

    return this.repository.save(subscription);
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update(id, { status: SubscriptionStatus.INACTIVE });
  }

  async findActiveByUser(userId: string): Promise<SubscriptionEntity[]> {
    return this.repository.find({
      where: { user: { id: userId }, status: SubscriptionStatus.ACTIVE },
      relations: ['user'],
    });
  }
}
