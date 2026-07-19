import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

// Shared base columns for every entity: UUID PK + timestamps.
export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
