import { DataSource, type DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { UserEntity } from './src/modules/users/entities/user.entity.js';
import { SubscriptionEntity } from './src/modules/subscriptions/entities/subscription.entity.js';

config();

const requiredVars = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
] as const;

const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing database env variables: ${missing.join(', ')}`);
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [UserEntity, SubscriptionEntity],
  migrations: ['src/migrations/[0-9]*{.ts,.js}'],
  synchronize: false,
};

export const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
