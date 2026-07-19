import { BadRequestException } from "@nestjs/common";
import { Paginated } from "@shared/response";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sort?: { field: string; order: "ASC" | "DESC" };
  search?: string;
  filters: Record<string, unknown>;
}

// Parses query string into normalized pagination/sort/filter params.
// Example query: ?page=2&limit=10&sort=createdAt:desc&search=foo&status=active
export function parsePagination(query: Record<string, any>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? "20"), 10) || 20));
  const sortRaw = typeof query.sort === "string" ? query.sort : undefined;
  let sort: PaginationParams["sort"];
  if (sortRaw) {
    const [field, order] = sortRaw.split(":");
    sort = { field: field || "createdAt", order: order === "asc" ? "ASC" : "DESC" };
  }
  const { page: _p, limit: _l, sort: _s, search: _se, ...rest } = query;
  const filters: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== "") filters[k] = v;
  }
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort,
    search: query.search ? String(query.search) : undefined,
    filters,
  };
}

export function toPaginated<T>(items: T[], total: number, p: PaginationParams): Paginated<T> {
  return {
    items,
    total,
    page: p.page,
    limit: p.limit,
    totalPages: Math.ceil(total / p.limit),
  };
}

export function assertFound<T>(value: T | null | undefined, message = "Not found"): T {
  if (value === null || value === undefined) throw new BadRequestException(message);
  return value;
}
