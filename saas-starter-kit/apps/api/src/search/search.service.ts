import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SearchDocument } from "./entities/search-document.entity";
import { parsePagination, toPaginated, PaginationParams } from "../core/pagination";
import { RbacService } from "../tenant/rbac.service";

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(SearchDocument) private readonly docs: Repository<SearchDocument>,
    private readonly rbac: RbacService
  ) {}

  async index(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
    title: string;
    body?: string | null;
    module?: string;
  }): Promise<SearchDocument> {
    const existing = await this.docs.findOne({ where: { tenantId: input.tenantId, entityType: input.entityType, entityId: input.entityId } });
    if (existing) {
      Object.assign(existing, { title: input.title, body: input.body, module: input.module });
      return this.docs.save(existing);
    }
    return this.docs.save(this.docs.create(input));
  }

  async search(tenantId: string, query: Record<string, any>) {
    const p: PaginationParams = parsePagination(query);
    const qb = this.docs
      .createQueryBuilder("d")
      .where("d.tenantId = :tenantId", { tenantId });

    if (p.search) {
      qb.andWhere("(d.title ILIKE :q OR d.body ILIKE :q)", { q: `%${p.search}%` });
    }
    if (p.filters.module) qb.andWhere("d.module = :module", { module: p.filters.module });
    if (p.filters.entityType) qb.andWhere("d.entityType = :entityType", { entityType: p.filters.entityType });

    const [items, total] = await qb
      .orderBy(`d.${p.sort?.field ?? "createdAt"}`, p.sort?.order ?? "DESC")
      .skip(p.skip)
      .take(p.limit)
      .getManyAndCount();

    return toPaginated(items, total, p);
  }
}
