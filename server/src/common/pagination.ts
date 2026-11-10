export type Pagination = { page: number; limit: number; skip: number; take: number };

export function getPagination(query: Record<string, unknown> | undefined, defaultLimit = 20): Pagination {
  const q = query ?? {};
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
