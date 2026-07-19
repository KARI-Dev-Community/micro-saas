import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

@Entity("feature_flags")
export class FeatureFlag extends BaseEntity {
  @Column({ type: "varchar", length: 64, unique: true })
  key!: string;

  @Column({ type: "varchar", length: 160 })
  label!: string;

  @Column({ type: "boolean", default: false })
  enabled!: boolean;

  @Column({ type: "jsonb", nullable: true })
  rules?: Record<string, unknown>; // e.g. per-plan enablement
}

@Entity("system_settings")
export class SystemSetting extends BaseEntity {
  @Column({ type: "varchar", length: 64, unique: true })
  key!: string;

  @Column({ type: "text" })
  value!: string;

  @Column({ type: "varchar", length: 32, default: "string" })
  type!: string; // string | number | boolean | json
}
