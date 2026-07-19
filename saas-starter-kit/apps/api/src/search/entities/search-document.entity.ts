import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

// Lightweight full-text search index. Backed by the DB's text search in
// production (Postgres tsvector / MySQL FULLTEXT); this table powers
// global search across modules with unified ranking.
@Entity("search_documents")
@Index(["tenantId", "entityType", "createdAt"])
export class SearchDocument extends BaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string; // organizationId

  @Column({ type: "varchar", length: 64 })
  entityType!: string; // project | task | user ...

  @Column({ type: "uuid" })
  entityId!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  body?: string | null;

  @Column({ type: "varchar", length: 64, default: "" })
  module!: string;

  // Postgres: tsvector generated column. MySQL: FULLTEXT index on (title, body).
  @Column({ type: "text", nullable: true, select: false })
  searchVector?: string;
}
