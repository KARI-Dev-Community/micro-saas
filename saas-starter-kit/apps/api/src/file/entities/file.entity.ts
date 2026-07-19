import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { FileVisibility } from "@shared/enums";

// File metadata. Actual bytes live in object storage (S3/local). Supports
// versioning + public/private visibility + presigned downloads.
@Entity("files")
@Index(["ownerId", "createdAt"])
export class FileEntity extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  ownerId?: string | null;

  @Column({ type: "uuid", nullable: true })
  organizationId?: string | null;

  @Column({ type: "varchar", length: 255 })
  fileName!: string;

  @Column({ type: "varchar", length: 255 })
  storedKey!: string; // storage key / path

  @Column({ type: "varchar", length: 255 })
  mimeType!: string;

  @Column({ type: "bigint", default: 0 })
  sizeBytes!: number;

  @Column({ type: "varchar", length: 32, default: FileVisibility.PRIVATE })
  visibility!: FileVisibility;

  @Column({ type: "uuid", nullable: true })
  parentFileId?: string | null; // for versioning

  @Column({ type: "integer", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 512, nullable: true })
  url?: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;
}
