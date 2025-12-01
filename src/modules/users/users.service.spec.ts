import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { UserEntity, UserStatus } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<UserEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(UserEntity));
  });

  it('finds user by telegram id', async () => {
    const user = { id: '1', telegramId: '123', status: UserStatus.ACTIVE } as UserEntity;
    repository.findOne.mockResolvedValue(user);

    const result = await service.findByTelegramId('123');

    expect(result).toBe(user);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { telegramId: '123' } });
  });

  it('returns existing active user without creating a new one', async () => {
    const existing = { id: '1', telegramId: '321', status: UserStatus.ACTIVE } as UserEntity;
    repository.findOne.mockResolvedValue(existing);

    const [user, created] = await service.createOrGet('321');

    expect(user).toBe(existing);
    expect(created).toBe(false);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('reactivates inactive user and marks as created', async () => {
    const existing = {
      id: '1',
      telegramId: '555',
      status: UserStatus.INACTIVE,
      deactivatedAt: new Date('2024-01-01'),
    } as UserEntity;
    const saved = { ...existing, status: UserStatus.ACTIVE, deactivatedAt: null };
    repository.findOne.mockResolvedValue(existing);
    repository.save.mockResolvedValue(saved);

    const [user, created] = await service.createOrGet('555');

    expect(repository.save).toHaveBeenCalledWith(existing);
    expect(existing.status).toBe(UserStatus.ACTIVE);
    expect(existing.deactivatedAt).toBeNull();
    expect(user).toBe(saved);
    expect(created).toBe(true);
  });

  it('creates new user when none exists', async () => {
    repository.findOne.mockResolvedValue(null);
    const createdEntity = { id: '2', telegramId: '999', status: UserStatus.ACTIVE } as UserEntity;
    repository.create.mockReturnValue(createdEntity);
    repository.save.mockResolvedValue(createdEntity);

    const [user, created] = await service.createOrGet('999');

    expect(repository.create).toHaveBeenCalledWith({ telegramId: '999', status: UserStatus.ACTIVE });
    expect(repository.save).toHaveBeenCalledWith(createdEntity);
    expect(user).toBe(createdEntity);
    expect(created).toBe(true);
  });

  it('marks user as inactive by telegram id', async () => {
    repository.update.mockResolvedValue({} as never);

    await service.removeByTelegramId('777');

    expect(repository.update).toHaveBeenCalledTimes(1);
    const [criteria, data] = repository.update.mock.calls[0];
    expect(criteria).toEqual({ telegramId: '777' });
    expect(data.status).toBe(UserStatus.INACTIVE);
    expect(data.deactivatedAt).toBeInstanceOf(Date);
  });
});
