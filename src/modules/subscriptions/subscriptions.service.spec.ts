import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionEntity, SubscriptionStatus, SubscriptionType } from './entities/subscription.entity';
import { UserEntity } from '../users/entities/user.entity';

type SubscriptionRepositoryMock = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  find: jest.Mock;
};

const createRepositoryMock = (): SubscriptionRepositoryMock => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
});

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let repository: SubscriptionRepositoryMock;
  const user: UserEntity = { id: 'user-1' } as UserEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(SubscriptionEntity),
          useValue: createRepositoryMock(),
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    repository = module.get<SubscriptionRepositoryMock>(getRepositoryToken(SubscriptionEntity));
  });

  it('returns existing active subscription without saving', async () => {
    const existing = {
      id: 'sub-1',
      user,
      type: SubscriptionType.STEAM,
      status: SubscriptionStatus.ACTIVE,
    } as SubscriptionEntity;
    repository.findOne.mockResolvedValue(existing);

    const result = await service.createForUser(user, SubscriptionType.STEAM);

    expect(result).toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { user: { id: user.id }, type: SubscriptionType.STEAM },
      relations: ['user'],
    });
  });

  it('reactivates inactive subscription and saves it', async () => {
    const existing = {
      id: 'sub-2',
      user,
      type: SubscriptionType.STEAM,
      status: SubscriptionStatus.INACTIVE,
    } as SubscriptionEntity;
    const saved = { ...existing, status: SubscriptionStatus.ACTIVE };
    repository.findOne.mockResolvedValue(existing);
    repository.save.mockResolvedValue(saved);

    const result = await service.createForUser(user, SubscriptionType.STEAM);

    expect(existing.status).toBe(SubscriptionStatus.ACTIVE);
    expect(repository.save).toHaveBeenCalledWith(existing);
    expect(result).toBe(saved);
  });

  it('creates and saves new subscription when none exists', async () => {
    repository.findOne.mockResolvedValue(null);
    const created = {
      id: 'sub-3',
      user,
      type: SubscriptionType.STEAM,
      status: SubscriptionStatus.ACTIVE,
    } as SubscriptionEntity;
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    const result = await service.createForUser(user, SubscriptionType.STEAM);

    expect(repository.create).toHaveBeenCalledWith({
      user,
      type: SubscriptionType.STEAM,
      status: SubscriptionStatus.ACTIVE,
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(result).toBe(created);
  });

  it('marks subscription as inactive by id', async () => {
    repository.update.mockResolvedValue({} as never);

    await service.deactivate('sub-4');

    expect(repository.update).toHaveBeenCalledWith('sub-4', { status: SubscriptionStatus.INACTIVE });
  });

  it('finds active subscriptions for a user', async () => {
    const subscriptions = [
      { id: 'sub-5', user, type: SubscriptionType.STEAM, status: SubscriptionStatus.ACTIVE } as SubscriptionEntity,
    ];
    repository.find.mockResolvedValue(subscriptions);

    const result = await service.findActiveByUser(user.id);

    expect(result).toBe(subscriptions);
    expect(repository.find).toHaveBeenCalledWith({
      where: { user: { id: user.id }, status: SubscriptionStatus.ACTIVE },
      relations: ['user'],
    });
  });
});
