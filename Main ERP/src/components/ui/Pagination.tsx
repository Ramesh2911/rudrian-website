import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
};

export function Pagination({ page, totalPages, total, onPage }: Props) {
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-1 pt-3 text-xs text-muted">
        <span>
          {total} record{total === 1 ? "" : "s"}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
      <span className="text-xs text-muted">
        Page {page} of {totalPages} &middot; {total} records
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1} icon={<ChevronLeft className="h-3.5 w-3.5" />}>
          Prev
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages} icon={<ChevronRight className="h-3.5 w-3.5" />}>
          Next
        </Button>
      </div>
    </div>
  );
}
