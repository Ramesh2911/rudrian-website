import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line bg-page/70 text-xs uppercase tracking-wide text-muted">{children}</tr>
    </thead>
  );
}

export function TH({ children, className = "", ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`} {...rest}>
      {children}
    </th>
  );
}

export function TD({ children, className = "", ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-middle text-body ${className}`} {...rest}>
      {children}
    </td>
  );
}

export function TR({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-line/70 last:border-0 ${onClick ? "cursor-pointer transition hover:bg-brand-50/60" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function mobileStackHead(label: string) {
  return <span className="text-[10px] uppercase tracking-wide text-muted md:hidden">{label}</span>;
}
