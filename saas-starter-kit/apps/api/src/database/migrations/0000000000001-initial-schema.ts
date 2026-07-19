import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableUnique } from "typeorm";

// Initial schema migration for the SaaS Starter Kit.
// PostgreSQL-flavored. For MySQL, swap uuid defaults / timestamptz -> datetime
// and FULLTEXT for the search vector (see mysql notes in README).
export class InitialSchema0000000000001 implements MigrationInterface {
  name = "InitialSchema0000000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(new Table({
      name: "users",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "email", type: "varchar", length: "255", isUnique: true },
        { name: "passwordHash", type: "varchar", length: "255", isNullable: true },
        { name: "status", type: "varchar", length: "32", default: "'pending'" },
        { name: "provider", type: "varchar", length: "32", default: "'email'" },
        { name: "providerId", type: "varchar", length: "255", isNullable: true },
        { name: "emailVerified", type: "boolean", default: false },
        { name: "emailVerificationToken", type: "varchar", length: "255", isNullable: true },
        { name: "emailVerificationExpiresAt", type: "timestamptz", isNullable: true },
        { name: "passwordResetToken", type: "varchar", length: "255", isNullable: true },
        { name: "passwordResetExpiresAt", type: "timestamptz", isNullable: true },
        { name: "twoFactorMethod", type: "varchar", length: "32", default: "'none'" },
        { name: "twoFactorSecret", type: "varchar", length: "64", isNullable: true },
        { name: "twoFactorEnabled", type: "boolean", default: false },
        { name: "locale", type: "varchar", length: "16", default: "'en'" },
        { name: "timezone", type: "varchar", length: "64", default: "'UTC'" },
        { name: "currency", type: "varchar", length: "8", default: "'USD'" },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);

    await queryRunner.createTable(new Table({
      name: "user_profiles",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "userId", type: "uuid" },
        { name: "firstName", type: "varchar", length: "120", isNullable: true },
        { name: "lastName", type: "varchar", length: "120", isNullable: true },
        { name: "avatarUrl", type: "varchar", length: "512", isNullable: true },
        { name: "phone", type: "varchar", length: "64", isNullable: true },
        { name: "preferences", type: "jsonb", default: "'{}'" },
        { name: "notificationSettings", type: "jsonb", default: "'{}'" },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("user_profiles", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("user_profiles", new TableIndex({ name: "idx_user_profiles_user", columnNames: ["userId"] }));

    await queryRunner.createTable(new Table({
      name: "sessions",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "userId", type: "uuid" },
        { name: "tokenId", type: "varchar", length: "64", isUnique: true },
        { name: "deviceName", type: "varchar", length: "255", isNullable: true },
        { name: "deviceType", type: "varchar", length: "255", isNullable: true },
        { name: "browser", type: "varchar", length: "255", isNullable: true },
        { name: "os", type: "varchar", length: "64", isNullable: true },
        { name: "ipAddress", type: "varchar", length: "45", isNullable: true },
        { name: "userAgent", type: "varchar", length: "512", isNullable: true },
        { name: "location", type: "varchar", length: "255", isNullable: true },
        { name: "expiresAt", type: "timestamptz" },
        { name: "lastActivityAt", type: "timestamptz", isNullable: true },
        { name: "isActive", type: "boolean", default: true },
        { name: "current", type: "boolean", default: false },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("sessions", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("sessions", new TableIndex({ name: "idx_sessions_user", columnNames: ["userId"] }));

    await queryRunner.createTable(new Table({
      name: "passkeys",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "userId", type: "uuid" },
        { name: "credentialId", type: "varchar", length: "255" },
        { name: "publicKey", type: "text" },
        { name: "deviceName", type: "varchar", length: "255", isNullable: true },
        { name: "counter", type: "integer" },
        { name: "transports", type: "varchar", length: "64", default: "'cross-platform'" },
        { name: "lastUsedAt", type: "timestamptz", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("passkeys", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("passkeys", new TableIndex({ name: "idx_passkeys_user", columnNames: ["userId"] }));

    await queryRunner.createTable(new Table({
      name: "organizations",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "slug", type: "varchar", length: "64", isUnique: true },
        { name: "name", type: "varchar", length: "160" },
        { name: "logoUrl", type: "varchar", length: "512", isNullable: true },
        { name: "locale", type: "varchar", length: "64", default: "'en'" },
        { name: "timezone", type: "varchar", length: "64", default: "'UTC'" },
        { name: "currency", type: "varchar", length: "8", default: "'USD'" },
        { name: "isActive", type: "boolean", default: true },
        { name: "settings", type: "jsonb", default: "'{}'" },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);

    await queryRunner.createTable(new Table({
      name: "workspaces",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "organizationId", type: "uuid" },
        { name: "name", type: "varchar", length: "64" },
        { name: "slug", type: "varchar", length: "64", isNullable: true },
        { name: "isActive", type: "boolean", default: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("workspaces", new TableForeignKey({ columnNames: ["organizationId"], referencedTableName: "organizations", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("workspaces", new TableIndex({ name: "idx_workspaces_org", columnNames: ["organizationId"] }));

    await queryRunner.createTable(new Table({
      name: "teams",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "workspaceId", type: "uuid" },
        { name: "organizationId", type: "uuid" },
        { name: "name", type: "varchar", length: "120" },
        { name: "description", type: "text", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("teams", new TableForeignKey({ columnNames: ["workspaceId"], referencedTableName: "workspaces", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("teams", new TableIndex({ name: "idx_teams_workspace", columnNames: ["workspaceId"] }));

    await queryRunner.createTable(new Table({
      name: "memberships",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "userId", type: "uuid" },
        { name: "organizationId", type: "uuid" },
        { name: "workspaceId", type: "uuid", isNullable: true },
        { name: "teamId", type: "uuid", isNullable: true },
        { name: "role", type: "varchar", length: "32", default: "'member'" },
        { name: "status", type: "varchar", length: "32", default: "'invited'" },
        { name: "invitationToken", type: "varchar", length: "255", isNullable: true },
        { name: "invitationExpiresAt", type: "timestamptz", isNullable: true },
        { name: "joinedAt", type: "timestamptz", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("memberships", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("memberships", new TableForeignKey({ columnNames: ["organizationId"], referencedTableName: "organizations", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("memberships", new TableIndex({ name: "idx_memberships_user", columnNames: ["userId"] }));
    await queryRunner.createIndex("memberships", new TableIndex({ name: "idx_memberships_org", columnNames: ["organizationId"] }));

    await queryRunner.createTable(new Table({
      name: "roles",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "name", type: "varchar", length: "32", isUnique: true },
        { name: "label", type: "varchar", length: "160" },
        { name: "description", type: "text", isNullable: true },
        { name: "isSystem", type: "boolean", default: false },
        { name: "organizationId", type: "uuid", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);

    await queryRunner.createTable(new Table({
      name: "permissions",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "key", type: "varchar", length: "64", isUnique: true },
        { name: "label", type: "varchar", length: "160" },
        { name: "group", type: "varchar", length: "64", default: "'General'" },
        { name: "description", type: "text", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);

    await queryRunner.createTable(new Table({
      name: "role_permissions",
      columns: [
        { name: "roleId", type: "uuid" },
        { name: "permissionId", type: "uuid" },
      ],
    }), false);
    await queryRunner.createForeignKey("role_permissions", new TableForeignKey({ columnNames: ["roleId"], referencedTableName: "roles", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("role_permissions", new TableForeignKey({ columnNames: ["permissionId"], referencedTableName: "permissions", referencedColumnNames: ["id"], onDelete: "CASCADE" }));

    await queryRunner.createTable(new Table({
      name: "subscriptions",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "organizationId", type: "uuid" },
        { name: "plan", type: "varchar", length: "32", default: "'free'" },
        { name: "status", type: "varchar", length: "32", default: "'active'" },
        { name: "provider", type: "varchar", length: "64", isNullable: true },
        { name: "providerSubscriptionId", type: "varchar", length: "255", isNullable: true },
        { name: "providerCustomerId", type: "varchar", length: "255", isNullable: true },
        { name: "couponCode", type: "varchar", length: "255", isNullable: true },
        { name: "amountCents", type: "integer", isNullable: true },
        { name: "currency", type: "varchar", length: "8", default: "'usd'" },
        { name: "trialEndsAt", type: "timestamptz", isNullable: true },
        { name: "currentPeriodStart", type: "timestamptz", isNullable: true },
        { name: "currentPeriodEnd", type: "timestamptz", isNullable: true },
        { name: "canceledAt", type: "timestamptz", isNullable: true },
        { name: "cancelAtPeriodEnd", type: "boolean", default: false },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("subscriptions", new TableForeignKey({ columnNames: ["organizationId"], referencedTableName: "organizations", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("subscriptions", new TableIndex({ name: "idx_subscriptions_org", columnNames: ["organizationId"] }));

    await queryRunner.createTable(new Table({
      name: "invoices",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "organizationId", type: "uuid" },
        { name: "number", type: "varchar", length: "64", isNullable: true },
        { name: "providerInvoiceId", type: "varchar", length: "255", isNullable: true },
        { name: "amountCents", type: "integer" },
        { name: "currency", type: "varchar", length: "8", default: "'usd'" },
        { name: "status", type: "varchar", length: "32", default: "'paid'" },
        { name: "pdfUrl", type: "varchar", length: "255", isNullable: true },
        { name: "paidAt", type: "timestamptz", isNullable: true },
        { name: "metadata", type: "jsonb", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createIndex("invoices", new TableIndex({ name: "idx_invoices_org", columnNames: ["organizationId"] }));

    await queryRunner.createTable(new Table({
      name: "coupons",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "code", type: "varchar", length: "64", isUnique: true },
        { name: "type", type: "varchar", length: "32", default: "'percent'" },
        { name: "value", type: "integer" },
        { name: "currency", type: "varchar", length: "8", default: "'usd'" },
        { name: "maxRedemptions", type: "integer", isNullable: true },
        { name: "redemptions", type: "integer", default: 0 },
        { name: "expiresAt", type: "timestamptz", isNullable: true },
        { name: "isActive", type: "boolean", default: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);

    await queryRunner.createTable(new Table({
      name: "audit_logs",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "actorId", type: "uuid", isNullable: true },
        { name: "organizationId", type: "uuid", isNullable: true },
        { name: "module", type: "varchar", length: "64" },
        { name: "action", type: "varchar", length: "64" },
        { name: "entityType", type: "varchar", length: "64", isNullable: true },
        { name: "entityId", type: "uuid", isNullable: true },
        { name: "oldValue", type: "jsonb", isNullable: true },
        { name: "newValue", type: "jsonb", isNullable: true },
        { name: "ipAddress", type: "varchar", length: "45", isNullable: true },
        { name: "userAgent", type: "varchar", length: "512", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createIndex("audit_logs", new TableIndex({ name: "idx_audit_actor", columnNames: ["actorId"] }));
    await queryRunner.createIndex("audit_logs", new TableIndex({ name: "idx_audit_module", columnNames: ["module"] }));

    await queryRunner.createTable(new Table({
      name: "notifications",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "userId", type: "uuid" },
        { name: "organizationId", type: "uuid", isNullable: true },
        { name: "channel", type: "varchar", length: "32", default: "'in_app'" },
        { name: "status", type: "varchar", length: "32", default: "'unread'" },
        { name: "title", type: "varchar", length: "160" },
        { name: "body", type: "text", isNullable: true },
        { name: "link", type: "varchar", length: "255", isNullable: true },
        { name: "category", type: "varchar", length: "64", isNullable: true },
        { name: "metadata", type: "jsonb", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("notifications", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("notifications", new TableIndex({ name: "idx_notifications_user", columnNames: ["userId"] }));

    await queryRunner.createTable(new Table({
      name: "files",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "ownerId", type: "uuid", isNullable: true },
        { name: "organizationId", type: "uuid", isNullable: true },
        { name: "fileName", type: "varchar", length: "255" },
        { name: "storedKey", type: "varchar", length: "255" },
        { name: "mimeType", type: "varchar", length: "255" },
        { name: "sizeBytes", type: "bigint", default: 0 },
        { name: "visibility", type: "varchar", length: "32", default: "'private'" },
        { name: "parentFileId", type: "uuid", isNullable: true },
        { name: "version", type: "integer", default: 1 },
        { name: "url", type: "varchar", length: "512", isNullable: true },
        { name: "metadata", type: "jsonb", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createIndex("files", new TableIndex({ name: "idx_files_owner", columnNames: ["ownerId"] }));

    await queryRunner.createTable(new Table({
      name: "search_documents",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "tenantId", type: "uuid" },
        { name: "entityType", type: "varchar", length: "64" },
        { name: "entityId", type: "uuid" },
        { name: "title", type: "varchar", length: "255" },
        { name: "body", type: "text", isNullable: true },
        { name: "module", type: "varchar", length: "64", default: "''" },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createIndex("search_documents", new TableIndex({ name: "idx_search_tenant", columnNames: ["tenantId"] }));
    await queryRunner.query(`CREATE INDEX idx_search_documents_fts ON search_documents USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,'')))`);

    await queryRunner.createTable(new Table({
      name: "ai_conversations",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "userId", type: "uuid" },
        { name: "organizationId", type: "uuid", isNullable: true },
        { name: "title", type: "varchar", length: "160", default: "'New conversation'" },
        { name: "type", type: "varchar", length: "64", default: "'chat'" },
        { name: "isActive", type: "boolean", default: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("ai_conversations", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("ai_conversations", new TableIndex({ name: "idx_ai_conv_user", columnNames: ["userId"] }));

    await queryRunner.createTable(new Table({
      name: "ai_messages",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "conversationId", type: "uuid" },
        { name: "role", type: "varchar", length: "16" },
        { name: "content", type: "text" },
        { name: "promptTokens", type: "integer", isNullable: true },
        { name: "completionTokens", type: "integer", isNullable: true },
        { name: "metadata", type: "jsonb", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("ai_messages", new TableForeignKey({ columnNames: ["conversationId"], referencedTableName: "ai_conversations", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("ai_messages", new TableIndex({ name: "idx_ai_msg_conv", columnNames: ["conversationId"] }));

    await queryRunner.createTable(new Table({
      name: "ai_usage",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "organizationId", type: "uuid", isNullable: true },
        { name: "userId", type: "uuid", isNullable: true },
        { name: "date", type: "date" },
        { name: "model", type: "varchar", length: "64" },
        { name: "promptTokens", type: "integer", default: 0 },
        { name: "completionTokens", type: "integer", default: 0 },
        { name: "costUsd", type: "decimal", precision: 12, scale: 6, default: 0 },
        { name: "requestCount", type: "integer", default: 0 },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createIndex("ai_usage", new TableIndex({ name: "idx_ai_usage_org", columnNames: ["organizationId"] }));

    await queryRunner.createTable(new Table({
      name: "ai_prompts",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "organizationId", type: "uuid", isNullable: true },
        { name: "createdBy", type: "uuid", isNullable: true },
        { name: "name", type: "varchar", length: "160" },
        { name: "content", type: "text" },
        { name: "category", type: "varchar", length: "64", default: "'general'" },
        { name: "isSystem", type: "boolean", default: false },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);

    await queryRunner.createTable(new Table({
      name: "projects",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "organizationId", type: "uuid" },
        { name: "workspaceId", type: "uuid", isNullable: true },
        { name: "name", type: "varchar", length: "160" },
        { name: "description", type: "text", isNullable: true },
        { name: "status", type: "varchar", length: "32", default: "'active'" },
        { name: "ownerId", type: "uuid", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("projects", new TableForeignKey({ columnNames: ["organizationId"], referencedTableName: "organizations", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("projects", new TableIndex({ name: "idx_projects_org", columnNames: ["organizationId"] }));

    await queryRunner.createTable(new Table({
      name: "tasks",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "projectId", type: "uuid" },
        { name: "organizationId", type: "uuid" },
        { name: "title", type: "varchar", length: "200" },
        { name: "description", type: "text", isNullable: true },
        { name: "status", type: "varchar", length: "32", default: "'todo'" },
        { name: "priority", type: "varchar", length: "32", default: "'medium'" },
        { name: "assigneeId", type: "uuid", isNullable: true },
        { name: "dueDate", type: "timestamptz", isNullable: true },
        { name: "position", type: "integer", default: 0 },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("tasks", new TableForeignKey({ columnNames: ["projectId"], referencedTableName: "projects", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("tasks", new TableIndex({ name: "idx_tasks_project", columnNames: ["projectId"] }));

    await queryRunner.createTable(new Table({
      name: "task_comments",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "taskId", type: "uuid" },
        { name: "authorId", type: "uuid" },
        { name: "content", type: "text" },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createForeignKey("task_comments", new TableForeignKey({ columnNames: ["taskId"], referencedTableName: "tasks", referencedColumnNames: ["id"], onDelete: "CASCADE" }));

    await queryRunner.createTable(new Table({
      name: "activities",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "organizationId", type: "uuid" },
        { name: "projectId", type: "uuid", isNullable: true },
        { name: "taskId", type: "uuid", isNullable: true },
        { name: "actorId", type: "uuid" },
        { name: "type", type: "varchar", length: "64" },
        { name: "message", type: "text", isNullable: true },
        { name: "metadata", type: "jsonb", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
    await queryRunner.createIndex("activities", new TableIndex({ name: "idx_activities_org", columnNames: ["organizationId"] }));

    await queryRunner.createTable(new Table({
      name: "feature_flags",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "key", type: "varchar", length: "64", isUnique: true },
        { name: "label", type: "varchar", length: "160" },
        { name: "enabled", type: "boolean", default: false },
        { name: "rules", type: "jsonb", isNullable: true },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);

    await queryRunner.createTable(new Table({
      name: "system_settings",
      columns: [
        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
        { name: "key", type: "varchar", length: "64", isUnique: true },
        { name: "value", type: "text" },
        { name: "type", type: "varchar", length: "32", default: "'string'" },
        { name: "createdAt", type: "timestamptz", default: "now()" },
        { name: "updatedAt", type: "timestamptz", default: "now()" },
      ],
    }), false);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ["system_settings", "feature_flags", "activities", "task_comments", "tasks", "projects", "ai_prompts", "ai_usage", "ai_messages", "ai_conversations", "search_documents", "files", "notifications", "audit_logs", "coupons", "invoices", "subscriptions", "role_permissions", "permissions", "roles", "memberships", "teams", "workspaces", "organizations", "passkeys", "sessions", "user_profiles", "users"];
    for (const t of tables) {
      await queryRunner.dropTable(t, true);
    }
  }
}
