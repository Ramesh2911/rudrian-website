import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Pagination } from "./Pagination";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  cellClassName?: string;
  align?: "left" | "center" | "right";
  sortValue?: (row: T) => string | number;
};

export type DataTablePagination = {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  pagination?: DataTablePagination;
  minWidth?: string;
};

const ALIGN: Record<string, string> = { left: "text-left", center: "text-center", right: "text-right" };

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 6,
  empty,
  onRowClick,
  pagination,
  minWidth = "min-w-[760px]",
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "en");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null,
    );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className={`w-full ${minWidth} border-collapse text-left`}>
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`border-b border-line bg-page/70 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted ${ALIGN[col.align ?? "left"]}`}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-ink ${
                          active ? "text-[#0b7a75]" : ""
                        }`}
                      >
                        {col.header}
                        {active ? (
                          sort.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-line/70 last:border-0">
                    {columns.map((col, ci) => (
                      <td key={col.key} className="px-4 py-4">
                        <div
                          className="animate-shimmer h-4 rounded-md"
                          style={{ width: ci === 0 ? "72%" : ci % 2 ? "54%" : "66%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : sortedRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`group border-b border-line/70 transition-colors last:border-0 ${
                      onRowClick
                        ? "cursor-pointer hover:bg-[#12b2aa]/[0.05]"
                        : "hover:bg-page/60"
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 align-middle text-sm text-body ${ALIGN[col.align ?? "left"]} ${col.cellClassName ?? ""}`}
                      >
                        {col.render ? col.render(row) : null}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && sortedRows.length === 0 && empty ? (
        <div className="px-4 py-10">{empty}</div>
      ) : null}
      {!loading && pagination ? (
        <div className="border-t border-line px-4 pb-4">
          <Pagination {...pagination} />
        </div>
      ) : null}
    </div>
  );
}
