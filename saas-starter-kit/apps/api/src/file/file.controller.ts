import { Controller, Post, Get, Delete, Param, Body, UseGuards, Query, Header, Res } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard, AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { FileService } from "./file.service";
import { FileVisibility } from "@shared/enums";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

class UploadMetaDto {
  @ApiProperty() @IsString() fileName!: string;
  @ApiProperty() @IsString() mimeType!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty({ enum: FileVisibility, required: false }) @IsOptional() @IsEnum(FileVisibility) visibility?: FileVisibility;
}

@Controller("files")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FileController {
  constructor(private readonly files: FileService) {}

  @Post("upload")
  @Permissions("file.upload")
  async upload(
    @CurrentOrganization() orgId: string,
    @AuthUser() user: AccessTokenPayload,
    @Query() meta: UploadMetaDto,
    @Body() body: { base64: string }
  ) {
    const buffer = Buffer.from(body.base64, "base64");
    return this.files.upload({
      ownerId: user.sub,
      organizationId: orgId!,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      visibility: meta.visibility ?? FileVisibility.PRIVATE,
      buffer,
    });
  }

  @Get()
  @Permissions("file.read")
  async list(@CurrentOrganization() orgId: string) {
    return this.files.list(orgId!);
  }

  @Get(":id/presign")
  @Permissions("file.read")
  async presign(@Param("id") id: string, @AuthUser() user: AccessTokenPayload) {
    return { url: await this.files.presign(id, user.sub) };
  }

  @Post(":id/version")
  @Permissions("file.upload")
  async version(@Param("id") id: string, @Body() body: { base64: string; mimeType: string }) {
    return this.files.newVersion(id, Buffer.from(body.base64, "base64"), body.mimeType);
  }

  @Delete(":id")
  @Permissions("file.delete")
  async remove(@Param("id") id: string) {
    await this.files.remove(id);
    return { removed: true };
  }
}
