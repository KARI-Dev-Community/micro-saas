# New Module Template

Copy these files when adding a new feature module. Replace `Feature`/`feature` with your resource name (e.g. `Invoice`, `invoices`).

## 1. Entity: `apps/api/src/feature/entities/feature.entity.ts`

```ts
import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

@Entity("features")
@Index(["organizationId", "createdAt"])
export class Feature extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  organizationId!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "varchar", length: 32, default: "active" })
  status!: string;
}
```

## 2. Module: `apps/api/src/feature/feature.module.ts`

```ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Feature } from "./entities/feature.entity";
import { FeatureService } from "./feature.service";
import { FeatureController } from "./feature.controller";
import { TenantModule } from "../tenant/tenant.module";
import { BillingModule } from "../billing/billing.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Feature]),
    TenantModule,
    BillingModule,
    AuditModule,
  ],
  providers: [FeatureService],
  controllers: [FeatureController],
  exports: [FeatureService],
})
export class FeatureModule {}
```

## 3. Service: `apps/api/src/feature/feature.service.ts`

```ts
import { Injectable, NotFoundException, BusinessException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Feature } from "./entities/feature.entity";
import { RbacService } from "../tenant/rbac.service";
import { AuditService } from "../audit/audit.service";
import { Permission } from "@shared/enums";
import { parsePagination, toPaginated, PaginationParams } from "../core/pagination";

@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Feature) private readonly repo: Repository<Feature>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, userId: string, query: Record<string, any>) {
    await this.rbac.assertPermission(userId, organizationId, Permission.FEATURE_READ);
    const p: PaginationParams = parsePagination(query);
    const qb = this.repo.createQueryBuilder("f").where("f.organizationId = :orgId", { orgId: organizationId });
    if (p.search) qb.andWhere("f.name ILIKE :q", { q: `%${p.search}%` });
    const [items, total] = await qb.orderBy(`f.${p.sort?.field ?? "createdAt"}`, p.sort?.order ?? "DESC").skip(p.skip).take(p.limit).getManyAndCount();
    return toPaginated(items, total, p);
  }

  async create(organizationId: string, userId: string, dto: { name: string; description?: string }) {
    await this.rbac.assertPermission(userId, organizationId, Permission.FEATURE_CREATE);
    const item = await this.repo.save(this.repo.create({ organizationId, ...dto }));
    await this.audit.record("feature", "created", { actorId: userId, organizationId }, { entityType: "feature", entityId: item.id });
    return item;
  }

  async findOne(id: string, organizationId: string) {
    const item = await this.repo.findOne({ where: { id, organizationId } });
    if (!item) throw new NotFoundException("Not found");
    return item;
  }

  async update(id: string, organizationId: string, userId: string, patch: Partial<Feature>) {
    const item = await this.findOne(id, organizationId);
    await this.rbac.assertPermission(userId, organizationId, Permission.FEATURE_UPDATE);
    Object.assign(item, patch, { updatedAt: new Date() });
    return this.repo.save(item);
  }

  async remove(id: string, organizationId: string) {
    const item = await this.findOne(id, organizationId);
    await this.repo.remove(item);
    return { deleted: true };
  }
}
```

## 4. Controller: `apps/api/src/feature/feature.controller.ts`

```ts
import { Controller, Get, Post, Body, Patch, Param, UseGuards } from "@nestjs/common";
import { AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { FeatureService } from "./feature.service";
import { Permission } from "@shared/enums";

class CreateFeatureDto {
  name!: string;
  description?: string;
}

@Controller("features")
@UseGuards(PermissionGuard)
export class FeatureController {
  constructor(private readonly svc: FeatureService) {}

  @Get()
  @Permissions(Permission.FEATURE_READ)
  async list(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload) {
    return this.svc.list(orgId!, user.sub, {} as any);
  }

  @Post()
  @Permissions(Permission.FEATURE_CREATE)
  async create(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CreateFeatureDto) {
    return this.svc.create(orgId!, user.sub, dto);
  }

  @Get(":id")
  @Permissions(Permission.FEATURE_READ)
  async get(@Param("id") id: string, @CurrentOrganization() orgId: string) {
    return this.svc.findOne(id, orgId!);
  }

  @Patch(":id")
  @Permissions(Permission.FEATURE_UPDATE)
  async update(@Param("id") id: string, @CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() patch: any) {
    return this.svc.update(id, orgId!, user.sub, patch);
  }

  @Delete(":id")
  @Permissions(Permission.FEATURE_DELETE)
  async remove(@Param("id") id: string, @CurrentOrganization() orgId: string) {
    return this.svc.remove(id, orgId!);
  }
}
```

## 5. Register in `apps/api/src/app.module.ts`

```ts
import { FeatureModule } from "./feature/feature.module";

@Module({
  imports: [
    // ... existing imports
    FeatureModule,
  ],
})
export class AppModule {}
```

## 6. Add permissions to `packages/shared/src/enums.ts`

```ts
export enum Permission {
  // ... existing permissions
  FEATURE_READ = "feature.read",
  FEATURE_CREATE = "feature.create",
  FEATURE_UPDATE = "feature.update",
  FEATURE_DELETE = "feature.delete",
}
```

## 7. Grant permissions to roles in `ROLE_PERMISSIONS`

Add the new `Permission.FEATURE_*` values to the role arrays that should have access (e.g. `ORG_OWNER`, `ADMIN`, `MEMBER`).

## 8. Frontend page: `apps/web/src/app/dashboard/features/page.tsx`

```tsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Can } from "@/components/providers";
import { Permission } from "@shared/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FeatureItem { id: string; name: string; description: string | null; status: string; }

export default function FeaturesPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["features", activeOrgId],
    queryFn: () => api.get<{ items: FeatureItem[] }>("/api/features", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  const create = useMutation({
    mutationFn: () => api.post<FeatureItem>("/api/features", { name, description: "" }, { organizationId: activeOrgId }),
    onSuccess: () => { setName(""); setError(null); qc.invalidateQueries({ queryKey: ["features", activeOrgId] }); },
    onError: (e: any) => setError(e?.message ?? "Failed"),
  });

  const items = data?.items ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Features</h1>

      <Can permission={Permission.FEATURE_CREATE}>
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">New feature</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>Add</Button>
          </CardContent>
          {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
        </Card>
      </Can>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell><span className="text-xs bg-secondary px-2 py-1 rounded">{i.status}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## 9. Run migration

```bash
npm run migration:generate --workspace apps/api -- name=AddFeatures
npm run migrate --workspace apps/api
```
