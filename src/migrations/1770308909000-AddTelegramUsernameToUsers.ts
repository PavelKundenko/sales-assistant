import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegramUsernameToUsers1770308909000 implements MigrationInterface {
  name = 'AddTelegramUsernameToUsers1770308909000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "telegram_username" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "telegram_username"`);
  }
}
