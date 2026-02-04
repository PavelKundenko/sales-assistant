import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdateReceivedAtToUserPreferences1770069229111 implements MigrationInterface {
  name = 'AddUpdateReceivedAtToUserPreferences1770069229111';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_preferences" ADD "sales_update_received_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "user_preferences" ADD "wishlist_update_received_at" TIMESTAMP`);

    // Create user preferences for all users who don't have them yet
    await queryRunner.query(`
      INSERT INTO "user_preferences" ("user_id", "sales_update_frequency", "wishlist_update_frequency", "platform")
      SELECT 
        u.id,
        1,
        1,
        '{PC,MAC,STEAM_DECK}'
      FROM "users" u
      LEFT JOIN "user_preferences" up ON up.user_id = u.id
      WHERE up.id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_preferences" DROP COLUMN "wishlist_update_received_at"`);
    await queryRunner.query(`ALTER TABLE "user_preferences" DROP COLUMN "sales_update_received_at"`);
  }
}
