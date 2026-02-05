import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferences1769943569089 implements MigrationInterface {
  name = 'AddUserPreferences1769943569089';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."user_preferences_platform_enum" AS ENUM('PC', 'MAC', 'STEAM_DECK')`);
    await queryRunner.query(
      `CREATE TABLE "user_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sales_update_frequency" integer NOT NULL DEFAULT '1', "wishlist_update_frequency" integer NOT NULL DEFAULT '1', "platform" "public"."user_preferences_platform_enum" array NOT NULL DEFAULT '{PC,MAC,STEAM_DECK}', "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "REL_458057fa75b66e68a275647da2" UNIQUE ("user_id"), CONSTRAINT "PK_e8cfb5b31af61cd363a6b6d7c25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"`);
    await queryRunner.query(`DROP TABLE "user_preferences"`);
    await queryRunner.query(`DROP TYPE "public"."user_preferences_platform_enum"`);
  }
}
