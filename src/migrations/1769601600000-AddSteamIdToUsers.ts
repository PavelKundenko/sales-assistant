import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSteamIdToUsers1769601600000 implements MigrationInterface {
  name = 'AddSteamIdToUsers1769601600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "steam_id" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "steam_id"`);
  }
}
