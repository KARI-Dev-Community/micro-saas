import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { FileEntity } from "./entities/file.entity";
import { ConfigService } from "@nestjs/config";
import { RbacService } from "../tenant/rbac.service";
import { FileVisibility } from "@shared/enums";
import { RedisService } from "../core/redis/redis.service";

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    private readonly config: ConfigService,
    private readonly rbac: RbacService,
    private readonly redis: RedisService
  ) {}

  async upload(input: {
    ownerId: string;
    organizationId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    visibility: FileVisibility;
    buffer: Buffer;
  }): Promise<FileEntity> {
    await this.rbac.assertPermission(input.ownerId, input.organizationId, "file.upload");
    const key = `${input.organizationId}/${randomUUID()}-${input.fileName}`;
    // Local storage for the starter kit. Swap with S3/MinIO in production.
    const dir = this.config.get<string>("app.storage.localDir") ?? "./uploads";
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, key), input.buffer);

    const file = this.files.create({
      ownerId: input.ownerId,
      organizationId: input.organizationId,
      fileName: input.fileName,
      storedKey: key,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: input.visibility,
      version: 1,
      url: input.visibility === FileVisibility.PUBLIC ? `${this.config.get("app.storage.baseUrl")}/${key}` : null,
    });
    return this.files.save(file);
  }

  // Generates a short-lived presigned download token (stored in Redis).
  async presign(fileId: string, userId: string, ttlSeconds = 300): Promise<string> {
    const file = await this.files.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException();
    const token = randomUUID();
    await this.redis.set(`file:${token}`, JSON.stringify({ fileId, userId }), ttlSeconds);
    return `${this.config.get("app.storage.baseUrl")}/${file.storedKey}?token=${token}`;
  }

  async newVersion(fileId: string, buffer: Buffer, mimeType: string): Promise<FileEntity> {
    const file = await this.files.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException();
    const version = file.version + 1;
    const key = `${file.organizationId}/${randomUUID()}-v${version}-${file.fileName}`;
    fs.writeFileSync(path.join((this.config.get<string>("app.storage.localDir") ?? "./uploads"), key), buffer);
    const newFile = this.files.create({
      ownerId: file.ownerId,
      organizationId: file.organizationId,
      fileName: file.fileName,
      storedKey: key,
      mimeType,
      sizeBytes: buffer.length,
      visibility: file.visibility,
      parentFileId: file.id,
      version,
    });
    return this.files.save(newFile);
  }

  async list(organizationId: string): Promise<FileEntity[]> {
    return this.files.find({ where: { organizationId }, order: { createdAt: "DESC" } });
  }

  async remove(fileId: string): Promise<void> {
    const file = await this.files.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException();
    await this.files.delete(fileId);
    try { fs.unlinkSync(path.join((this.config.get<string>("app.storage.localDir") ?? "./uploads"), file.storedKey)); } catch { /* ignore missing file */ }
  }
}
