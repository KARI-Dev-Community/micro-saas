import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AddMissingIndexes1743396600000 implements MigrationInterface {
  name = "AddMissingIndexes1743396600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex("memberships", new TableIndex({ name: "idx_memberships_user_org_status", columnNames: ["userId", "organizationId", "status"] }));
    await queryRunner.createIndex("notifications", new TableIndex({ name: "idx_notifications_user_status", columnNames: ["userId", "status"] }));
    await queryRunner.createIndex("files", new TableIndex({ name: "idx_files_org", columnNames: ["organizationId"] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("memberships", "idx_memberships_user_org_status");
    await queryRunner.dropIndex("notifications", "idx_notifications_user_status");
    await queryRunner.dropIndex("files", "idx_files_org");
  }
}
