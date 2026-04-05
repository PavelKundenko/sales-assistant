import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserPreferencesEntity } from './entities/user-preferences.entity';
import { UsersService } from './users.service';
import { UserPreferencesService } from './user-preferences.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserPreferencesEntity])],
  providers: [UsersService, UserPreferencesService],
  exports: [UsersService, UserPreferencesService],
})
export class UsersModule {}
