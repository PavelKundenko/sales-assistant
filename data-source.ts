import { DataSource, type DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { UserEntity } from './src/modules/users/entities/user.entity';
import { SubscriptionEntity } from './src/modules/subscriptions/entities/subscription.entity';

config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable');
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: [UserEntity, SubscriptionEntity],
  migrations: ['src/migrations/[0-9]*{.ts,.js}'],
  synchronize: false,
  ssl: { rejectUnauthorized: false },
};

export const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
