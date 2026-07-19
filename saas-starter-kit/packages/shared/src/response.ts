// Standard API response envelope shared by backend and frontend.
//
// {
//   success: boolean,
//   message: string,
//   data: object | null,
//   meta: object | null   // pagination, totals, etc.
// }

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: ApiMeta | null;
}

export function ok<T>(data: T, message = "Success", meta?: ApiMeta): ApiResponse<T> {
  return { success: true, message, data, meta: meta ?? null };
}

export function fail(message: string, data: unknown = null): ApiResponse {
  return { success: false, message, data };
}

// Standard paginated query params (query string -> validated by Zod on the backend).
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string; // e.g. "createdAt:desc"
  search?: string;
  [filter: string]: string | number | undefined;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
